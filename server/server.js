import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import jwt from 'jsonwebtoken';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const SECRET_KEY = 'your-secret-key'; // In production, use an environment variable

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

// Database setup
const db = new sqlite3.Database('./src/db/users.db');

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Training blocks table
db.run(`
  CREATE TABLE IF NOT EXISTS training_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    is_favorited BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Training plans table
db.run(`
  CREATE TABLE IF NOT EXISTS training_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    tags TEXT,
    is_favorited BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Plan weeks table (to store week information for each plan)
db.run(`
  CREATE TABLE IF NOT EXISTS plan_weeks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER,
    week_number INTEGER,
    FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
  )
`);

// Daily blocks table (to store block assignments with time slots)
db.run(`
  CREATE TABLE IF NOT EXISTS daily_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_id INTEGER,
    day_of_week INTEGER,
    block_id INTEGER,
    time_slot TEXT,
    FOREIGN KEY (week_id) REFERENCES plan_weeks(id) ON DELETE CASCADE,
    FOREIGN KEY (block_id) REFERENCES training_blocks(id)
  )
`);

app.use(express.json());
app.use(express.static(join(__dirname, '../src')));
app.use('/components', express.static(join(__dirname, '../src/components')));
app.use('/api/plans', authenticateUser);
app.use('/api/blocks', authenticateUser);

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  db.run('INSERT INTO users (email, password) VALUES (?, ?)', 
    [email, hashedPassword], 
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      // Create token and return same structure as login
      const token = jwt.sign({ id: this.lastID, email: email }, SECRET_KEY);
      res.json({ 
        token, 
        user: { 
          id: this.lastID, 
          email: email 
        } 
      });
    });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(400).json({ error: 'Invalid password' });
      return;
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY);
    res.json({ token, user: { id: user.id, email: user.email } });
  });
});

// create block
app.post('/api/blocks', authenticateUser, (req, res) => {
  const { title, description, tags } = req.body;
  const userId = req.user.id;

  db.run(
    'INSERT INTO training_blocks (user_id, title, description, tags) VALUES (?, ?, ?, ?)',
    [userId, title, description, tags],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({
        id: this.lastID,
        user_id: userId,
        title,
        description,
        tags,
        is_favorited: 0
      });
    }
  );
});

// Get all blocks for the authenticated user
app.get('/api/blocks', authenticateUser, (req, res) => {
  const userId = req.user.id;
  
  db.all(
    'SELECT * FROM training_blocks WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, blocks) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json(blocks);
    }
  );
});

// Edit a block
app.put('/api/blocks/:id', authenticateUser, (req, res) => {
  const blockId = req.params.id;
  const userId = req.user.id;
  const { title, description, tags, is_favorited } = req.body;

  // First verify the block belongs to the user
  db.get(
    'SELECT * FROM training_blocks WHERE id = ? AND user_id = ?',
    [blockId, userId],
    (err, block) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (!block) {
        res.status(404).json({ error: 'Block not found or unauthorized' });
        return;
      }

      // Update the block
      db.run(
        `UPDATE training_blocks 
         SET title = ?, description = ?, tags = ?, is_favorited = ?
         WHERE id = ? AND user_id = ?`,
        [title, description, tags, is_favorited, blockId, userId],
        function(err) {
          if (err) {
            res.status(400).json({ error: err.message });
            return;
          }
          res.json({
            id: blockId,
            user_id: userId,
            title,
            description,
            tags,
            is_favorited
          });
        }
      );
    }
  );
});

// Delete a block
app.delete('/api/blocks/:id', authenticateUser, (req, res) => {
  const blockId = req.params.id;
  const userId = req.user.id;

  // First verify the block belongs to the user
  db.get(
    'SELECT * FROM training_blocks WHERE id = ? AND user_id = ?',
    [blockId, userId],
    (err, block) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (!block) {
        res.status(404).json({ error: 'Block not found or unauthorized' });
        return;
      }

      // Delete the block
      db.run(
        'DELETE FROM training_blocks WHERE id = ? AND user_id = ?',
        [blockId, userId],
        function(err) {
          if (err) {
            res.status(400).json({ error: err.message });
            return;
          }
          
          // Also delete any references in daily_blocks
          db.run(
            'DELETE FROM daily_blocks WHERE block_id = ?',
            [blockId],
            function(err) {
              if (err) {
                res.status(400).json({ error: err.message });
                return;
              }
              res.json({ success: true });
            }
          );
        }
      );
    }
  );
});

// Toggle block favorite status
app.put('/api/blocks/:id/favorite', authenticateUser, (req, res) => {
  const blockId = req.params.id;
  const userId = req.user.id;

  // First verify the block belongs to the user and get current favorite status
  db.get(
      'SELECT is_favorited FROM training_blocks WHERE id = ? AND user_id = ?',
      [blockId, userId],
      (err, block) => {
          if (err) {
              res.status(400).json({ error: err.message });
              return;
          }
          if (!block) {
              res.status(404).json({ error: 'Block not found or unauthorized' });
              return;
          }

          // Toggle the favorite status
          const newFavoriteStatus = block.is_favorited ? 0 : 1;
          
          db.run(
              'UPDATE training_blocks SET is_favorited = ? WHERE id = ? AND user_id = ?',
              [newFavoriteStatus, blockId, userId],
              function(err) {
                  if (err) {
                      res.status(400).json({ error: err.message });
                      return;
                  }
                  res.json({ 
                      success: true, 
                      is_favorited: newFavoriteStatus 
                  });
              }
          );
      }
  );
});

// Create new training plan
app.post('/api/plans', authenticateUser, (req, res) => {
  const { title, tags } = req.body;
  const userId = req.user.id;

  db.run(
    'INSERT INTO training_plans (user_id, title, tags) VALUES (?, ?, ?)',
    [userId, title, tags],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }

      const planId = this.lastID;
      
      // Create initial week
      db.run(
        'INSERT INTO plan_weeks (plan_id, week_number) VALUES (?, ?)',
        [planId, 1],
        function(err) {
          if (err) {
            res.status(400).json({ error: err.message });
            return;
          }
          res.json({
            id: planId,
            user_id: userId,
            title,
            tags,
            is_favorited: 0
          });
        }
      );
    }
  );
});

// Get all training plans (basic info)
app.get('/api/plans', authenticateUser, (req, res) => {
  const userId = req.user.id;
  
  db.all(
    'SELECT id, title, tags, is_favorited, created_at FROM training_plans WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, plans) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json(plans);
    }
  );
});

// Get detailed plan data
app.get('/api/plans/:id', authenticateUser, (req, res) => {
  const planId = req.params.id;
  const userId = req.user.id;

  // First verify the plan belongs to the user
  db.get(
    'SELECT * FROM training_plans WHERE id = ? AND user_id = ?',
    [planId, userId],
    (err, plan) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (!plan) {
        res.status(404).json({ error: 'Plan not found or unauthorized' });
        return;
      }

      // Get all weeks for this plan
      db.all(
        'SELECT * FROM plan_weeks WHERE plan_id = ? ORDER BY week_number',
        [planId],
        (err, weeks) => {
          if (err) {
            res.status(400).json({ error: err.message });
            return;
          }

          // Get all daily blocks for all weeks
          const weekIds = weeks.map(w => w.id).join(',');
          db.all(
            `SELECT db.*, tb.title, tb.description, tb.tags 
             FROM daily_blocks db 
             JOIN training_blocks tb ON db.block_id = tb.id 
             WHERE db.week_id IN (${weekIds})
             ORDER BY db.week_id, db.day_of_week`,
            [],
            (err, dailyBlocks) => {
              if (err) {
                res.status(400).json({ error: err.message });
                return;
              }

              // Format the response
              const formattedWeeks = weeks.map(week => {
                const weekBlocks = dailyBlocks.filter(db => db.week_id === week.id);
                const days = {};
                
                // Group blocks by day
                weekBlocks.forEach(block => {
                  if (!days[block.day_of_week]) {
                    days[block.day_of_week] = [];
                  }
                  days[block.day_of_week].push({
                    id: block.block_id,
                    daily_block_id: block.id,  // ID from daily_blocks table
                    title: block.title,
                    description: block.description,
                    tags: block.tags,
                    time_slot: block.time_slot
                  });
                });

                return {
                  id: week.id,  // week ID from plan_weeks table
                  week_number: week.week_number,
                  days
                };
              });

              res.json({
                id: plan.id,
                user_id: plan.user_id,
                title: plan.title,
                tags: plan.tags,
                is_favorited: plan.is_favorited,
                created_at: plan.created_at,
                weeks: formattedWeeks
              });
            }
          );
        }
      );
    }
  );
});

// Edit training plan
app.put('/api/plans/:id', authenticateUser, async (req, res) => {
  const planId = req.params.id;
  const userId = req.user.id;
  const { title, tags, is_favorited, weeks } = req.body;

  // First verify the plan belongs to the user
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.get(
      'SELECT * FROM training_plans WHERE id = ? AND user_id = ?',
      [planId, userId],
      async (err, plan) => {
        if (err) {
          db.run('ROLLBACK');
          res.status(400).json({ error: err.message });
          return;
        }
        if (!plan) {
          db.run('ROLLBACK');
          res.status(404).json({ error: 'Plan not found or unauthorized' });
          return;
        }

        try {
          // Update plan details
          await new Promise((resolve, reject) => {
            db.run(
              'UPDATE training_plans SET title = ?, tags = ?, is_favorited = ? WHERE id = ?',
              [title, tags, is_favorited, planId],
              err => err ? reject(err) : resolve()
            );
          });

          // Get existing weeks
          const existingWeeks = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM plan_weeks WHERE plan_id = ?', [planId], (err, weeks) => {
              if (err) reject(err);
              else resolve(weeks || []);
            });
          });

          // Update or create weeks
          for (const week of weeks) {
            if (week.id) {
              // Update existing week
              await new Promise((resolve, reject) => {
                db.run(
                  'UPDATE plan_weeks SET week_number = ? WHERE id = ? AND plan_id = ?',
                  [week.week_number, week.id, planId],
                  err => err ? reject(err) : resolve()
                );
              });
            } else {
              // Create new week
              await new Promise((resolve, reject) => {
                db.run(
                  'INSERT INTO plan_weeks (plan_id, week_number) VALUES (?, ?)',
                  [planId, week.week_number],
                  function(err) {
                    if (err) reject(err);
                    else {
                      week.id = this.lastID;
                      resolve();
                    }
                  }
                );
              });
            }

            // Get existing daily blocks for this week
            const existingDailyBlocks = await new Promise((resolve, reject) => {
              db.all('SELECT * FROM daily_blocks WHERE week_id = ?', [week.id], (err, blocks) => {
                if (err) reject(err);
                else resolve(blocks || []);
              });
            });

            // Handle daily blocks for this week
            for (const [dayNum, blocks] of Object.entries(week.days)) {
              for (const block of blocks) {
                if (block.daily_block_id) {
                  // Update existing daily block
                  await new Promise((resolve, reject) => {
                    db.run(
                      'UPDATE daily_blocks SET time_slot = ? WHERE id = ?',
                      [block.time_slot, block.daily_block_id],
                      err => err ? reject(err) : resolve()
                    );
                  });
                } else {
                  // Create new daily block
                  await new Promise((resolve, reject) => {
                    db.run(
                      'INSERT INTO daily_blocks (week_id, day_of_week, block_id, time_slot) VALUES (?, ?, ?, ?)',
                      [week.id, dayNum, block.id, block.time_slot],
                      err => err ? reject(err) : resolve()
                    );
                  });
                }
              }
            }

            // Delete daily blocks that are no longer in the plan
            const keepDailyBlockIds = Object.values(week.days)
            .flat()
            .filter(b => b.daily_block_id)
            .map(b => b.daily_block_id);

            for (const existingBlock of existingDailyBlocks) {
            if (!keepDailyBlockIds.includes(existingBlock.id)) {
                await new Promise((resolve, reject) => {
                    db.run(
                        'DELETE FROM daily_blocks WHERE id = ?',
                        [existingBlock.id],
                        err => err ? reject(err) : resolve()
                    );
                });
            }
            }
          }

          // Remove weeks that are no longer in the plan
          const keepWeekIds = weeks.map(w => w.id).filter(id => id);
          for (const existingWeek of existingWeeks) {
            if (!keepWeekIds.includes(existingWeek.id)) {
              await new Promise((resolve, reject) => {
                db.run(
                  'DELETE FROM plan_weeks WHERE id = ?',
                  [existingWeek.id],
                  err => err ? reject(err) : resolve()
                );
              });
            }
          }

          db.run('COMMIT');
          res.json({ success: true });
        } catch (error) {
          db.run('ROLLBACK');
          res.status(400).json({ error: error.message });
        }
      }
    );
  });
});

// Delete training plan
app.delete('/api/plans/:id', authenticateUser, (req, res) => {
  const planId = req.params.id;
  const userId = req.user.id;

  // First verify the plan belongs to the user
  db.get(
    'SELECT * FROM training_plans WHERE id = ? AND user_id = ?',
    [planId, userId],
    (err, plan) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (!plan) {
        res.status(404).json({ error: 'Plan not found or unauthorized' });
        return;
      }

      // Delete the plan (cascades to weeks and daily_blocks)
      db.run(
        'DELETE FROM training_plans WHERE id = ? AND user_id = ?',
        [planId, userId],
        function(err) {
          if (err) {
            res.status(400).json({ error: err.message });
            return;
          }
          res.json({ success: true });
        }
      );
    }
  );
});

// Toggle plan favorite status
app.put('/api/plans/:id/favorite', authenticateUser, (req, res) => {
  const planId = req.params.id;
  const userId = req.user.id;

  // First verify the plan belongs to the user and get current favorite status
  db.get(
    'SELECT is_favorited FROM training_plans WHERE id = ? AND user_id = ?',
    [planId, userId],
    (err, plan) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (!plan) {
        res.status(404).json({ error: 'Plan not found or unauthorized' });
        return;
      }

      // Toggle the favorite status
      const newFavoriteStatus = plan.is_favorited ? 0 : 1;
      
      db.run(
        'UPDATE training_plans SET is_favorited = ? WHERE id = ? AND user_id = ?',
        [newFavoriteStatus, planId, userId],
        function(err) {
          if (err) {
            res.status(400).json({ error: err.message });
            return;
          }
          res.json({ 
            success: true, 
            is_favorited: newFavoriteStatus 
          });
        }
      );
    }
  );
});

// Get all resources (basic info only)
app.get('/api/resources/information', async (req, res) => {
  try {
      // Load graph data
      const graphPath = path.join(process.cwd(), 'resources', 'graph.yaml');
      const graphContent = await fs.readFile(graphPath, 'utf8');
      const graph = yaml.load(graphContent);

      // Load information resources
      const infoDir = path.join(process.cwd(), 'resources', 'information');
      const infoDirs = await fs.readdir(infoDir, { withFileTypes: true });
      
      // Get only directories
      const resourceDirs = infoDirs.filter(dirent => dirent.isDirectory());
      
      // Read each resource's index.yaml
      const resources = await Promise.all(
          resourceDirs.map(async (dir) => {
              const indexPath = path.join(infoDir, dir.name, 'index.yaml');
              try {
                  const fileContent = await fs.readFile(indexPath, 'utf8');
                  const resource = yaml.load(fileContent);
                  
                  // Return formatted resource data
                  return {
                      id: resource.id,
                      title: resource.title,
                      description: resource.description,
                      tags: Array.isArray(resource.tags) ? resource.tags.join(',') : resource.tags,
                      created_at: resource.created_at,
                      node_id: resource.node_id,
                      related_training_plans: resource.related_training_plans || []
                  };
              } catch (err) {
                  console.error(`Error reading resource ${dir.name}:`, err);
                  return null;
              }
          })
      );

      // Filter out any failed reads and sort by created_at
      const validResources = resources
          .filter(r => r !== null)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Return combined data
      res.json({
          graph,
          resources: validResources
      });
  } catch (error) {
      console.error('Error loading resources:', error);
      res.status(500).json({ error: 'Failed to load resources' });
  }
});

// Get detailed information resource
app.get('/api/resources/information/:id', async (req, res) => {
  const resourceId = req.params.id;

  try {
    // Load information resource
    const resourcePath = path.join(process.cwd(), 'resources', 'information', resourceId);
    
    // Load main resource data
    const indexFile = await fs.readFile(path.join(resourcePath, 'index.yaml'), 'utf8');
    const resource = yaml.load(indexFile);

    // Load content
    const contentFile = await fs.readFile(path.join(resourcePath, 'content.md'), 'utf8');

    // Format response
    const response = {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      content: contentFile,
      tags: Array.isArray(resource.tags) ? resource.tags.join(',') : resource.tags,
      created_at: resource.created_at,
      node_id: resource.node_id
    };

    res.json(response);
  } catch (error) {
    console.error('Error loading information resource:', error);
    res.status(500).json({ error: 'Failed to load information resource' });
  }
});

// Get detailed training resource
app.get('/api/resources/training/:id', async (req, res) => {
  const resourceId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];
  let userId = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      userId = decoded.id;
    } catch (err) {
      console.warn('Invalid token provided');
    }
  }

  try {
    const resourcePath = path.join(process.cwd(), 'resources', 'training', resourceId);
    
    // Load main resource data
    const indexFile = await fs.readFile(path.join(resourcePath, 'index.yaml'), 'utf8');
    const resource = yaml.load(indexFile);

    // Load content
    const contentFile = await fs.readFile(path.join(resourcePath, 'content.md'), 'utf8');

    // Load blocks
    const blocks = await Promise.all(
      resource.blocks.map(async (blockId) => {
        const blockFile = await fs.readFile(
          path.join(resourcePath, 'blocks', `${blockId}.yaml`),
          'utf8'
        );
        return yaml.load(blockFile);
      })
    );

    // Load plans
    const plans = await Promise.all(
      resource.plans.map(async (planId) => {
        const planFile = await fs.readFile(
          path.join(resourcePath, 'plans', `${planId}.yaml`),
          'utf8'
        );
        return yaml.load(planFile);
      })
    );

    // Format response
    const response = {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      content: contentFile,
      tags: Array.isArray(resource.tags) ? resource.tags.join(',') : resource.tags,
      created_at: resource.created_at,
      blocks: blocks.map(block => ({
        title: block.title,
        description: block.description,
        tags: Array.isArray(block.tags) ? block.tags.join(',') : block.tags
      })),
      plans: plans.map(plan => ({
        title: plan.title,
        tags: Array.isArray(plan.tags) ? plan.tags.join(',') : plan.tags,
        weeks: plan.weeks.map(week => ({
          week_number: week.week_number,
          days: week.days
        }))
      }))
    };

    if (userId) {
      response.copyableBlocks = blocks;
      response.copyablePlans = plans;
    }

    res.json(response);
  } catch (error) {
    console.error('Error loading training resource:', error);
    res.status(500).json({ error: 'Failed to load training resource' });
  }
});

app.post('/api/resources/training/suggest', async (req, res) => {
  const { path: selectedPath } = req.body;
  
  try {
      // Collect all related training plans from the path nodes
      const allRelatedPlans = selectedPath.reduce((plans, node) => {
          if (node.related_training_plans && Array.isArray(node.related_training_plans)) {
              plans.push(...node.related_training_plans);
          }
          return plans;
      }, []);

      // Count frequency of each training plan
      const planFrequency = allRelatedPlans.reduce((freq, planId) => {
          freq[planId] = (freq[planId] || 0) + 1;
          return freq;
      }, {});

      // Load training resources
      const trainingDir = join(process.cwd(), 'resources', 'training');
      const trainingDirs = await fs.readdir(trainingDir, { withFileTypes: true });
      
      const trainingResources = await Promise.all(
          trainingDirs
              .filter(dirent => dirent.isDirectory())
              .map(async (dir) => {
                  const indexPath = join(trainingDir, dir.name, 'index.yaml');
                  const content = await fs.readFile(indexPath, 'utf8');
                  return yaml.load(content);
              })
      );

      // Score resources based on frequency and path relevance
      const scoredResources = trainingResources
          .filter(resource => resource.target_paths && Array.isArray(resource.target_paths))
          .map(resource => {
              const frequency = planFrequency[resource.id] || 0;
              if (frequency === 0) return null;

              // Find the target path that contains the most selected nodes
              const bestMatchPath = resource.target_paths.reduce((best, targetPath) => {
                const selectedNodeIds = selectedPath.map(node => node.id);
                const matchingNodes = targetPath.nodes.filter(nodeId => 
                    selectedNodeIds.includes(nodeId)
                );
                
                // Calculate match percentage based on selected path coverage
                const matchPercentage = (matchingNodes.length / selectedNodeIds.length) * 100;
                
                if (matchPercentage > best.matchPercentage) {
                    return {
                        matchPercentage,
                        pathNodes: targetPath.nodes,
                        relevantNodes: matchingNodes
                    };
                }
                return best;
              }, { matchPercentage: 0, pathNodes: [], relevantNodes: [] });

              return {
                id: resource.id,
                title: resource.title,
                description: resource.description,
                frequency,
                matchScore: Math.round(bestMatchPath.matchPercentage),
                relevantPathLength: bestMatchPath.pathNodes.length
              };
          })
          .filter(resource => resource !== null);

      // Sort by frequency first, then by relevant path length for equal frequencies
      scoredResources.sort((a, b) => {
          if (b.frequency !== a.frequency) {
              return b.frequency - a.frequency;
          }
          return a.relevantPathLength - b.relevantPathLength;
      });

      res.json(scoredResources);
  } catch (error) {
      console.error('Error suggesting training resources:', error);
      res.status(500).json({ error: 'Failed to suggest training resources' });
  }
});

// Copy a training plan from a resource
app.post('/api/plans/copy', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const plan = req.body;
  
  db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      try {
          // Step 1: Get all unique block IDs and load their details from resources
          const uniqueBlockIds = new Set();
          plan.weeks.forEach(week => {
              Object.values(week.days).forEach(blocks => {
                  blocks.forEach(block => {
                      uniqueBlockIds.add(block.blockId);
                  });
              });
          });

          // Load block details from resource files
          const blockPromises = Array.from(uniqueBlockIds).map(async (blockId) => {
            try {
                // Get the resource ID from the block path (it's the first part of the path)
                const [resourceId, blockName] = blockId.split('/');
                const blockFile = await fs.readFile(
                    path.join(process.cwd(), 'resources', resourceId, 'blocks', `${blockName}.yaml`),
                    'utf8'
                );
                return yaml.load(blockFile);
            } catch (error) {
                throw new Error(`Failed to load block: ${blockId}`);
            }
          });

          Promise.all(blockPromises).then(blockDetails => {
              const blockMap = new Map();
          
              // Create new blocks for the user
              const createBlockPromises = blockDetails.map(block => 
                  new Promise((resolve, reject) => {
                      db.run(
                          'INSERT INTO training_blocks (user_id, title, description, tags, is_favorited) VALUES (?, ?, ?, ?, ?)',
                          [
                              userId,
                              block.title,
                              block.description,
                              Array.isArray(block.tags) ? block.tags.join(',') : block.tags,
                              0
                          ],
                          function(err) {
                              if (err) reject(err);
                              // Map the original block ID (from YAML) to the new database ID
                              blockMap.set(block.id, this.lastID);
                              resolve({
                                  originalId: block.id,
                                  newId: this.lastID
                              });
                          }
                      );
                  })
              );

              Promise.all(createBlockPromises).then(() => {
                  // Create the plan
                  db.run(
                      'INSERT INTO training_plans (user_id, title, tags, is_favorited) VALUES (?, ?, ?, ?)',
                      [userId, plan.title, plan.tags, 0],
                      function(err) {
                          if (err) throw err;
                          const newPlanId = this.lastID;

                          // Create weeks and add blocks
                          plan.weeks.forEach(week => {
                              db.run(
                                  'INSERT INTO plan_weeks (plan_id, week_number) VALUES (?, ?)',
                                  [newPlanId, week.week_number],
                                  function(err) {
                                      if (err) throw err;
                                      const newWeekId = this.lastID;

                                      Object.entries(week.days).forEach(([day, blocks]) => {
                                        blocks.forEach(block => {
                                            // Extract the original block ID from the full path
                                            const [_, blockName] = block.blockId.split('/');
                                            const newBlockId = blockMap.get(blockName);
                                            if (newBlockId) {
                                                db.run(
                                                    'INSERT INTO daily_blocks (week_id, day_of_week, block_id, time_slot) VALUES (?, ?, ?, ?)',
                                                    [newWeekId, day, newBlockId, block.time_slot]
                                                );
                                            }
                                        });
                                    });
                                  }
                              );
                          });

                          db.run('COMMIT');
                          res.json({
                              success: true,
                              planId: newPlanId
                          });
                      }
                  );
              }).catch(error => {
                  db.run('ROLLBACK');
                  throw error;
              });
          }).catch(error => {
              db.run('ROLLBACK');
              throw error;
          });
      } catch (error) {
          db.run('ROLLBACK');
          res.status(400).json({ error: error.message });
      }
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});