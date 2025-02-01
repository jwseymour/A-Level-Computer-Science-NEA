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

// Training Blocks endpoints
app.post('/api/blocks', async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user.id; // Assuming you have authentication middleware

  db.run(
    'INSERT INTO training_blocks (user_id, title, description) VALUES (?, ?, ?)',
    [userId, title, description],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/blocks/:id', async (req, res) => {
  const { title, description } = req.body;
  const blockId = req.params.id;
  const userId = req.user.id;

  db.run(
    'UPDATE training_blocks SET title = ?, description = ? WHERE id = ? AND user_id = ?',
    [title, description, blockId, userId],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Block not found or unauthorized' });
        return;
      }
      res.json({ success: true });
    }
  );
});

app.delete('/api/blocks/:id', async (req, res) => {
  const blockId = req.params.id;
  const userId = req.user.id;

  db.run(
    'DELETE FROM training_blocks WHERE id = ? AND user_id = ?',
    [blockId, userId],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Block not found or unauthorized' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// Get all plans for a user
app.get('/api/plans', async (req, res) => {
  const userId = req.user?.id;

  db.all(
      'SELECT * FROM training_plans WHERE user_id = ? ORDER BY created_at DESC',
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

// Training Plans endpoints
app.post('/api/plans', async (req, res) => {
  const { title, weeks } = req.body;
  const userId = req.user.id;
  console.log(userId, title, weeks);

  db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run(
          'INSERT INTO training_plans (user_id, title) VALUES (?, ?)',
          [userId, title],
          function(err) {
              if (err) {
                  db.run('ROLLBACK');
                  res.status(400).json({ error: err.message });
                  return;
              }

              const planId = this.lastID;
              let weekInsertError = false;

              weeks.forEach((week, weekIndex) => {
                  db.run(
                      'INSERT INTO plan_weeks (plan_id, week_number) VALUES (?, ?)',
                      [planId, weekIndex + 1],
                      function(err) {
                          if (err) {
                              weekInsertError = true;
                              return;
                          }

                          const weekId = this.lastID;
                          week.days.forEach((day) => {
                              day.blocks.forEach((block) => {
                                  db.run(
                                      'INSERT INTO daily_blocks (week_id, day_of_week, block_id, time_slot) VALUES (?, ?, ?, ?)',
                                      [weekId, day.dayOfWeek, block.blockId, block.timeSlot]
                                  );
                              });
                          });
                      }
                  );
              });

              if (weekInsertError) {
                  db.run('ROLLBACK');
                  res.status(400).json({ error: 'Error creating plan' });
                  return;
              }

              db.run('COMMIT');
              res.json({ id: planId });
          }
      );
  });
});

app.put('/api/plans/:id', async (req, res) => {
  const { title, weeks } = req.body;
  const planId = req.params.id;
  const userId = req.user.id;

  db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run(
          'UPDATE training_plans SET title = ? WHERE id = ? AND user_id = ?',
          [title, planId, userId],
          function(err) {
              if (err || this.changes === 0) {
                  db.run('ROLLBACK');
                  res.status(404).json({ error: 'Plan not found or unauthorized' });
                  return;
              }

              // Delete existing weeks and blocks
              db.run('DELETE FROM plan_weeks WHERE plan_id = ?', [planId]);

              // Insert new weeks and blocks
              let weekInsertError = false;

              weeks.forEach((week, weekIndex) => {
                  db.run(
                      'INSERT INTO plan_weeks (plan_id, week_number) VALUES (?, ?)',
                      [planId, weekIndex + 1],
                      function(err) {
                          if (err) {
                              weekInsertError = true;
                              return;
                          }

                          const weekId = this.lastID;
                          week.days.forEach((day) => {
                              day.blocks.forEach((block) => {
                                  db.run(
                                      'INSERT INTO daily_blocks (week_id, day_of_week, block_id, time_slot) VALUES (?, ?, ?, ?)',
                                      [weekId, day.dayOfWeek, block.blockId, block.timeSlot]
                                  );
                              });
                          });
                      }
                  );
              });

              if (weekInsertError) {
                  db.run('ROLLBACK');
                  res.status(400).json({ error: 'Error updating plan' });
                  return;
              }

              db.run('COMMIT');
              res.json({ success: true });
          }
      );
  });
});

app.get('/api/plans/:id', async (req, res) => {
  const planId = req.params.id;
  const userId = req.user?.id;

  db.get(
      `SELECT p.*, 
       GROUP_CONCAT(DISTINCT json_object(
           'id', pw.id,
           'weekNumber', pw.week_number,
           'days', (
               SELECT json_group_array(json_object(
                   'dayOfWeek', db.day_of_week,
                   'blockId', db.block_id,
                   'timeSlot', db.time_slot
               ))
               FROM daily_blocks db
               WHERE db.week_id = pw.id
               GROUP BY db.day_of_week
           )
       )) as weeks
       FROM training_plans p
       LEFT JOIN plan_weeks pw ON p.id = pw.plan_id
       WHERE p.id = ? AND p.user_id = ?
       GROUP BY p.id`,
      [planId, userId],
      (err, plan) => {
          if (err) {
              res.status(400).json({ error: err.message });
              return;
          }
          if (!plan) {
              res.status(404).json({ error: 'Plan not found' });
              return;
          }
          
          // Parse the weeks string into a proper JSON structure
          if (plan.weeks) {
              plan.weeks = JSON.parse(`[${plan.weeks}]`);
          } else {
              plan.weeks = [];
          }
          
          res.json(plan);
      }
  );
});

app.delete('/api/plans/:id', async (req, res) => {
  const planId = req.params.id;
  const userId = req.user.id;

  db.run(
    'DELETE FROM training_plans WHERE id = ? AND user_id = ?',
    [planId, userId],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Plan not found or unauthorized' });
        return;
      }
      res.json({ success: true });
    }
  );
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});