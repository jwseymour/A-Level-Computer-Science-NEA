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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});