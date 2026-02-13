const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tnt-secret-key-change-in-production';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, data, created_at, updated_at FROM tnt_saves WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json({ saves: result.rows });
  } catch (err) {
    console.error('List saves error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: 'Name and data required' });
    }
    const result = await db.query(
      'INSERT INTO tnt_saves (user_id, name, data) VALUES ($1, $2, $3) RETURNING id, name, data, created_at',
      [req.user.id, name, data]
    );
    res.json({ save: result.rows[0] });
  } catch (err) {
    console.error('Create save error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, data, created_at, updated_at FROM tnt_saves WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Save not found' });
    }
    res.json({ save: result.rows[0] });
  } catch (err) {
    console.error('Get save error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM tnt_saves WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete save error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
