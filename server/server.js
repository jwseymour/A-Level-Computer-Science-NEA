import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Create training plans tables
db.run(`
  CREATE TABLE IF NOT EXISTS training_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS training_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER,
    week_number INTEGER,
    day_number INTEGER,
    time TEXT,
    title TEXT,
    description TEXT,
    FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
  )
`);

app.use(express.json());
app.use(express.static(join(__dirname, '../src')));
app.use('/components', express.static(join(__dirname, '../src/components')));

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
    
    res.json({ id: user.id, email: user.email });
  });
});

// Get all training plans for a user
app.get('/api/training-plans/:userId', (req, res) => {
    const userId = req.params.userId;
    db.all(
      `SELECT p.*, GROUP_CONCAT(json_object(
        'id', b.id,
        'week_number', b.week_number,
        'day_number', b.day_number,
        'time', b.time,
        'title', b.title,
        'description', b.description
      )) as blocks
      FROM training_plans p
      LEFT JOIN training_blocks b ON p.id = b.plan_id
      WHERE p.user_id = ?
      GROUP BY p.id`,
      [userId],
      (err, plans) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        // Parse blocks from string to array
        plans = plans.map(plan => ({
          ...plan,
          blocks: plan.blocks ? JSON.parse(`[${plan.blocks}]`) : []
        }));
        res.json(plans);
      }
    );
  });
  
  // Create new training plan
  app.post('/api/training-plans', (req, res) => {
    const { name, userId } = req.body;
    db.run(
      'INSERT INTO training_plans (name, user_id) VALUES (?, ?)',
      [name, userId],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ id: this.lastID });
      }
    );
  });
  
  // Update training plan blocks
  app.post('/api/training-plans/:planId/blocks', (req, res) => {
    const planId = req.params.planId;
    const { blocks } = req.body;
    
    // First delete all existing blocks
    db.run('DELETE FROM training_blocks WHERE plan_id = ?', [planId], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Then insert new blocks
      const stmt = db.prepare(`
        INSERT INTO training_blocks (plan_id, week_number, day_number, time, title, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      blocks.forEach(block => {
        stmt.run([planId, block.weekNumber, block.dayNumber, block.time, block.title, block.description]);
      });
      
      stmt.finalize();
      res.json({ success: true });
    });
  });
  
  // Delete training plan
  app.delete('/api/training-plans/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM training_plans WHERE id = ?', [id], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    });
  });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});