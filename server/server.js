import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import jwt from 'jsonwebtoken';

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
      res.json({ id: this.lastID });
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

  // Start a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // First verify and update the plan
    db.get(
      'SELECT * FROM training_plans WHERE id = ? AND user_id = ?',
      [planId, userId],
      (err, plan) => {
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

        // Update plan details
        db.run(
          'UPDATE training_plans SET title = ?, tags = ?, is_favorited = ? WHERE id = ?',
          [title, tags, is_favorited, planId],
          async function(err) {
            if (err) {
              db.run('ROLLBACK');
              res.status(400).json({ error: err.message });
              return;
            }

            try {
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
              }

              // Remove weeks that are no longer in the plan
              const keepWeekIds = weeks.map(w => w.id).filter(id => id);
              if (keepWeekIds.length > 0) {
                await new Promise((resolve, reject) => {
                  db.run(
                    `DELETE FROM plan_weeks WHERE plan_id = ? AND id NOT IN (${keepWeekIds.join(',')})`,
                    [planId],
                    err => err ? reject(err) : resolve()
                  );
                });
              }

              db.run('COMMIT');
              res.json({ success: true });

            } catch (error) {
              db.run('ROLLBACK');
              res.status(400).json({ error: error.message });
            }
          }
        );
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});