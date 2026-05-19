const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'data.json');
let store = {
  users: [],
  projects: [],
  passwordResetTokens: [],
  nextUserId: 1,
  nextProjectId: 1
};

async function loadStore() {
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

  const hashedPassword = bcryptjs.hashSync(password, 10);

  const existingUser = store.users.find((u) => u.email === email || u.username === username);
  if (existingUser) {
    return res.status(400).json({ error: 'Email or username already exists' });
  }

  const user = {
    id: getNextUserId(),
    email,
    username,
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };

  store.users.push(user);
  await saveStore();

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({
    message: 'Account created successfully',
    token,
    userId: user.id,
    username
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = store.users.find((u) => u.email === email);
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

  const user = store.users.find((u) => u.email === email);
  if (!user) {
    return res.status(200).json({ message: 'If this email exists, we sent a reset link.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();

  store.passwordResetTokens.push({ token, userId: user.id, expiresAt });
  await saveStore();

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

  const resetRecord = store.passwordResetTokens.find((record) => record.token === token);
  if (!resetRecord || new Date(resetRecord.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'Reset token is invalid or expired' });
  }

  const user = store.users.find((u) => u.id === resetRecord.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.password = bcryptjs.hashSync(password, 10);
  store.passwordResetTokens = store.passwordResetTokens.filter((record) => record.token !== token);
  await saveStore();

  res.json({ message: 'Password updated successfully' });
});

// Get user profile
app.get('/api/auth/profile', verifyToken, (req, res) => {
  const user = store.users.find((u) => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, username: user.username, email: user.email });
});

// Get all projects for user
app.get('/api/projects', verifyToken, (req, res) => {
  const projects = store.projects
    .filter((project) => project.userId === req.userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(({ id, projectName, createdAt, updatedAt }) => ({ id, projectName, createdAt, updatedAt }));

  res.json(projects);
});

// Get single project
app.get('/api/projects/:projectId', verifyToken, (req, res) => {
  const project = store.projects.find(
    (item) => item.id === Number(req.params.projectId) && item.userId === req.userId
  );

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

  const project = {
    id: getNextProjectId(),
    userId: req.userId,
    projectName,
    formData: formData || {},
    estimate: estimate || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.projects.push(project);
  await saveStore();

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

  const project = store.projects.find(
    (item) => item.id === projectId && item.userId === req.userId
  );

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  project.projectName = projectName;
  project.formData = formData || {};
  project.estimate = estimate || null;
  project.updatedAt = new Date().toISOString();

  await saveStore();
  res.json({ message: 'Project updated successfully' });
});

// Delete project
app.delete('/api/projects/:projectId', verifyToken, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const index = store.projects.findIndex(
    (item) => item.id === projectId && item.userId === req.userId
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }

  store.projects.splice(index, 1);
  await saveStore();
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
