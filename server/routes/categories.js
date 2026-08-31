const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// GET all categories
router.get('/', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST create category
router.post('/', (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const id = 'cat-' + crypto.randomUUID().slice(0, 8);
    const catColor = color || '#6B7280';

    db.prepare('INSERT INTO categories (id, name, color) VALUES (?, ?, ?)').run(id, name.trim(), catColor);
    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// DELETE category
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
