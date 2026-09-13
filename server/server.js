const express = require('express');
const cors = require('cors');
const path = require('path');

// Ensure db is loaded and schemas created
require('./db');

const tasksRouter = require('./routes/tasks');
const categoriesRouter = require('./routes/categories');
const settingsRouter = require('./routes/settings');
const openprojectRouter = require('./routes/openproject');
const notesRouter = require('./routes/notes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/openproject', openprojectRouter);
app.use('/api/notes', notesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'NexTask', time: new Date().toISOString() });
});

// Process error handling
process.on('uncaughtException', (err) => {
  console.error('Server Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Server Unhandled Rejection at:', promise, 'reason:', reason);
});

const server = app.listen(PORT, () => {
  console.log(`NexTask server running at http://localhost:${PORT}`);
});

// Keep process open
setInterval(() => {}, 1000 * 60 * 60);

