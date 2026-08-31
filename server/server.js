const express = require('express');
const cors = require('cors');
const path = require('path');

// Ensure db is loaded and schemas created
require('./db');

const tasksRouter = require('./routes/tasks');
const categoriesRouter = require('./routes/categories');
const settingsRouter = require('./routes/settings');
const openprojectRouter = require('./routes/openproject');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/openproject', openprojectRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'NexTask', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`NexTask server running at http://localhost:${PORT}`);
});
