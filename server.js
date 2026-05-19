const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'data.json');
let pool = null;
let store = {
  users: [],
  projects: [],
  passwordResetTokens: [],
  nextUserId: 1,
  nextProjectId: 1
};

async function loadStore() {
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
    await initializeDatabase();
    return;
  }

  try {
    const raw = await fs.readFile(dbPath, 'utf8');
    const data = JSON.parse(raw);
    store = {
      users: (data.users || []).map((user) => ({
        ...user,
        email: user.email?.trim().toLowerCase() || '',
        username: user.username?.trim() || user.username
      })),
      projects: data.projects || [],
      passwordResetTokens: data.passwordResetTokens || [],
      nextUserId: data.nextUserId || 1,
      nextProjectId: data.nextProjectId || 1
    };

    // Save normalized email/user values back to the store immediately
    await saveStore();
  } catch (err) {
    if (err.code === 'ENOENT') {
      await saveStore();
    } else {
      console.error('Could not load store:', err);
    }
  }
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_name TEXT NOT NULL,
      form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      estimate JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
}

async function sendPasswordResetEmail(email, resetUrl) {
  const transporterConfig = {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: process.env.EMAIL_USER
      ? {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      : undefined
  };

  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const transporter = nodemailer.createTransport(transporterConfig);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Reset your Jewelry Calculator password',
      text: `Click the link to reset your password: ${resetUrl}`,
      html: `<p>Click the link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
    });
  } else {
    console.log('Password reset link:', resetUrl);
  }
}

function hasEmailConfig() {
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

async function saveStore() {
  await fs.writeFile(dbPath, JSON.stringify(store, null, 2), 'utf8');
}

function getNextUserId() {
  return store.nextUserId++;
}

function getNextProjectId() {
  return store.nextProjectId++;
}

function normalizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    password: row.password,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.createdAt || row.created_at
  };
}

function normalizeProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    projectName: row.project_name,
    formData: row.form_data,
    estimate: row.estimate,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.createdAt || row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updatedAt || row.updated_at
  };
}

async function findUserByEmail(email) {
  if (pool) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return normalizeUser(result.rows[0]);
  }

  return store.users.find((u) => u.email === email) || null;
}

async function findUserById(id) {
  if (pool) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return normalizeUser(result.rows[0]);
  }

  return store.users.find((u) => u.id === id) || null;
}

async function findUserByEmailOrUsername(email, username) {
  if (pool) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    return normalizeUser(result.rows[0]);
  }

  return store.users.find((u) => u.email === email || u.username === username) || null;
}

async function createUser({ email, username, password }) {
  if (pool) {
    const result = await pool.query(
      'INSERT INTO users (email, username, password) VALUES ($1, $2, $3) RETURNING *',
      [email, username, password]
    );
    return normalizeUser(result.rows[0]);
  }

  const user = {
    id: getNextUserId(),
    email,
    username,
    password,
    createdAt: new Date().toISOString()
  };

  store.users.push(user);
  await saveStore();
  return user;
}

async function updateUserPassword(userId, hashedPassword) {
  if (pool) {
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    return;
  }

  const user = store.users.find((u) => u.id === userId);
  if (user) {
    user.password = hashedPassword;
    await saveStore();
  }
}

async function createPasswordResetToken(token, userId, expiresAt) {
  if (pool) {
    await pool.query(
      'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [token, userId, expiresAt]
    );
    return;
  }

  store.passwordResetTokens.push({ token, userId, expiresAt });
  await saveStore();
}

async function findPasswordResetToken(token) {
  if (pool) {
    const result = await pool.query('SELECT token, user_id, expires_at FROM password_reset_tokens WHERE token = $1', [token]);
    const row = result.rows[0];
    return row
      ? {
          token: row.token,
          userId: row.user_id,
          expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at
        }
      : null;
  }

  return store.passwordResetTokens.find((record) => record.token === token) || null;
}

async function deletePasswordResetToken(token) {
  if (pool) {
    await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
    return;
  }

  store.passwordResetTokens = store.passwordResetTokens.filter((record) => record.token !== token);
  await saveStore();
}

async function listUserProjects(userId) {
  if (pool) {
    const result = await pool.query(
      `SELECT id, project_name, created_at, updated_at
       FROM projects
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );
    return result.rows.map(normalizeProject);
  }

  return store.projects
    .filter((project) => project.userId === userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function findUserProject(userId, projectId) {
  if (pool) {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);
    return normalizeProject(result.rows[0]);
  }

  return store.projects.find((item) => item.id === projectId && item.userId === userId) || null;
}

async function createUserProject(userId, { projectName, formData, estimate }) {
  if (pool) {
    const result = await pool.query(
      `INSERT INTO projects (user_id, project_name, form_data, estimate)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, projectName, formData || {}, estimate || null]
    );
    return normalizeProject(result.rows[0]);
  }

  const project = {
    id: getNextProjectId(),
    userId,
    projectName,
    formData: formData || {},
    estimate: estimate || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.projects.push(project);
  await saveStore();
  return project;
}

async function updateUserProject(userId, projectId, { projectName, formData, estimate }) {
  if (pool) {
    const result = await pool.query(
      `UPDATE projects
       SET project_name = $1, form_data = $2, estimate = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [projectName, formData || {}, estimate || null, projectId, userId]
    );
    return normalizeProject(result.rows[0]);
  }

  const project = store.projects.find((item) => item.id === projectId && item.userId === userId);
  if (!project) return null;

  project.projectName = projectName;
  project.formData = formData || {};
  project.estimate = estimate || null;
  project.updatedAt = new Date().toISOString();

  await saveStore();
  return project;
}

async function deleteUserProject(userId, projectId) {
  if (pool) {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);
    return result.rowCount > 0;
  }

  const index = store.projects.findIndex((item) => item.id === projectId && item.userId === userId);
  if (index === -1) return false;

  store.projects.splice(index, 1);
  await saveStore();
  return true;
}

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

app.get('/api/metal-price/:symbol', async (req, res) => {
  const symbol = req.params.symbol?.toUpperCase();
  const allowedSymbols = new Set(['XAU', 'XAG', 'XPT']);

  if (!allowedSymbols.has(symbol)) {
    return res.status(400).json({ error: 'Unsupported metal symbol' });
  }

  try {
    const response = await fetch(`https://api.gold-api.com/price/${symbol}`);
    const data = await response.json();

    if (!response.ok || !Number.isFinite(data.price)) {
      return res.status(502).json({ error: 'Live metal price unavailable' });
    }

    res.json({
      symbol: data.symbol || symbol,
      name: data.name,
      price: data.price,
      currency: data.currency || 'USD',
      updatedAt: data.updatedAt,
      updatedAtReadable: data.updatedAtReadable
    });
  } catch (err) {
    res.status(502).json({ error: 'Live metal price unavailable' });
  }
});

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  let { email, username, password } = req.body;
  email = email?.trim().toLowerCase();
  username = username?.trim();

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username, and password required' });
  }

  try {
    const existingUser = await findUserByEmailOrUsername(email, username);
    if (existingUser) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);
    const user = await createUser({ email, username, password: hashedPassword });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      message: 'Account created successfully',
      token,
      userId: user.id,
      username: user.username
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    console.error('Signup failed:', err);
    res.status(500).json({ error: 'Unable to create account' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
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

// Forgot password
app.post('/api/auth/forgot-password', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(200).json({ message: 'If this email exists, we sent a reset link.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();

  await createPasswordResetToken(token, user.id, expiresAt);

  const origin = req.headers.origin || process.env.FRONTEND_URL || `http://localhost:${PORT}`;
  const resetUrl = `${origin}/?resetToken=${token}`;

  try {
    await sendPasswordResetEmail(email, resetUrl);
  } catch (err) {
    console.error('Email send failed:', err);
  }

  const response = { message: 'If this email exists, we sent a reset link.' };
  if (!hasEmailConfig() && process.env.NODE_ENV !== 'production') {
    response.resetUrl = resetUrl;
  }

  res.status(200).json(response);
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  const resetRecord = await findPasswordResetToken(token);
  if (!resetRecord || new Date(resetRecord.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'Reset token is invalid or expired' });
  }

  const user = await findUserById(resetRecord.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await updateUserPassword(user.id, bcryptjs.hashSync(password, 10));
  await deletePasswordResetToken(token);

  res.json({ message: 'Password updated successfully' });
});

// Get user profile
app.get('/api/auth/profile', verifyToken, async (req, res) => {
  const user = await findUserById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, username: user.username, email: user.email });
});

// Get all projects for user
app.get('/api/projects', verifyToken, async (req, res) => {
  const projects = (await listUserProjects(req.userId))
    .map(({ id, projectName, createdAt, updatedAt }) => ({ id, projectName, createdAt, updatedAt }));

  res.json(projects);
});

// Get single project
app.get('/api/projects/:projectId', verifyToken, async (req, res) => {
  const project = await findUserProject(req.userId, Number(req.params.projectId));

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json(project);
});

// Create new project
app.post('/api/projects', verifyToken, async (req, res) => {
  const { projectName, formData, estimate } = req.body;

  if (!projectName) {
    return res.status(400).json({ error: 'Project name required' });
  }

  const project = await createUserProject(req.userId, { projectName, formData, estimate });

  res.status(201).json({
    id: project.id,
    projectName,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  });
});

// Update project
app.put('/api/projects/:projectId', verifyToken, async (req, res) => {
  const { projectName, formData, estimate } = req.body;
  const projectId = Number(req.params.projectId);

  const project = await updateUserProject(req.userId, projectId, { projectName, formData, estimate });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json({ message: 'Project updated successfully' });
});

// Delete project
app.delete('/api/projects/:projectId', verifyToken, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const deleted = await deleteUserProject(req.userId, projectId);

  if (!deleted) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json({ message: 'Project deleted successfully' });
});

loadStore()
  .then(() => {
    console.log('Store loaded');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Could not start server:', err);
    process.exit(1);
  });
