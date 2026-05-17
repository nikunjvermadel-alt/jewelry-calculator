const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Database setup
const dbPath = path.join(__dirname, 'jewelry.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database');
});

// Initialize database tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      projectName TEXT NOT NULL,
      formData TEXT NOT NULL,
      estimate TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes

// Sign up
app.post('/api/auth/signup', (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username, and password required' });
  }

  const hashedPassword = bcryptjs.hashSync(password, 10);

  db.run(
    'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
    [email, username, hashedPassword],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Email or username already exists' });
      }

      const token = jwt.sign({ userId: this.lastID }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ 
        message: 'Account created successfully',
        token,
        userId: this.lastID,
        username
      });
    }
  );
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = bcryptjs.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      message: 'Login successful',
      token,
      userId: user.id,
      username: user.username
    });
  });
});

// Get user profile
app.get('/api/auth/profile', verifyToken, (req, res) => {
  db.get('SELECT id, username, email FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

// Get all projects for user
app.get('/api/projects', verifyToken, (req, res) => {
  db.all(
    'SELECT id, projectName, createdAt, updatedAt FROM projects WHERE userId = ? ORDER BY updatedAt DESC',
    [req.userId],
    (err, projects) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching projects' });
      }
      res.json(projects || []);
    }
  );
});

// Get single project
app.get('/api/projects/:projectId', verifyToken, (req, res) => {
  db.get(
    'SELECT * FROM projects WHERE id = ? AND userId = ?',
    [req.params.projectId, req.userId],
    (err, project) => {
      if (err || !project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json({
        ...project,
        formData: JSON.parse(project.formData),
        estimate: project.estimate ? JSON.parse(project.estimate) : null
      });
    }
  );
});

// Create new project
app.post('/api/projects', verifyToken, (req, res) => {
  const { projectName, formData, estimate } = req.body;

  if (!projectName) {
    return res.status(400).json({ error: 'Project name required' });
  }

  db.run(
    'INSERT INTO projects (userId, projectName, formData, estimate) VALUES (?, ?, ?, ?)',
    [req.userId, projectName, JSON.stringify(formData), JSON.stringify(estimate)],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating project' });
      }
      res.status(201).json({ 
        id: this.lastID,
        projectName,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  );
});

// Update project
app.put('/api/projects/:projectId', verifyToken, (req, res) => {
  const { projectName, formData, estimate } = req.body;

  db.run(
    'UPDATE projects SET projectName = ?, formData = ?, estimate = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?',
    [projectName, JSON.stringify(formData), JSON.stringify(estimate), req.params.projectId, req.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating project' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json({ message: 'Project updated successfully' });
    }
  );
});

// Delete project
app.delete('/api/projects/:projectId', verifyToken, (req, res) => {
  db.run(
    'DELETE FROM projects WHERE id = ? AND userId = ?',
    [req.params.projectId, req.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting project' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json({ message: 'Project deleted successfully' });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
