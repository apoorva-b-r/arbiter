const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sanitizeLog } = require('../utils/sanitizeLog');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password are required'
    });
  }

  if (mongoose.connection.readyState !== 1) {
    // In production, the backend MUST strictly fail closed when MongoDB is unavailable
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        error: 'Database offline'
      });
    }

    // Permitted development/demo fallback (strictly non-production, only if explicitly enabled)
    if (process.env.ENABLE_OFFLINE_DEV_AUTH === 'true') {
      if (username === 'Operator-Alpha' && password === 'Arbiter2026!') {
        const secret = process.env.JWT_SECRET || 'arbiter-dev-secret';
        const token = jwt.sign(
          { username: 'Operator-Alpha', role: 'operator' },
          secret,
          { expiresIn: '8h' }
        );
        return res.status(200).json({
          username: 'Operator-Alpha',
          role: 'operator',
          token,
          warning: 'Development offline authentication fallback active'
        });
      }
      return res.status(401).json({ error: 'Incorrect Operator ID or passcode' });
    }

    return res.status(503).json({
      error: 'Database offline'
    });
  }

  try {
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        error: 'Incorrect Operator ID or passcode'
      });
    }

    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'arbiter-dev-secret');
    if (!secret) {
      console.error('[AUTH ERROR] Missing secure JWT_SECRET in production environment');
      return res.status(500).json({ error: 'Internal server error' });
    }

    const token = jwt.sign(
      { username: user.username, role: user.role },
      secret,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      username: user.username,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('[AUTH] Login failed:', sanitizeLog(error.message));
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({
      error: 'Operator ID is required'
    });
  }

  const trimmedUsername = username.trim();
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  if (!usernameRegex.test(trimmedUsername)) {
    return res.status(400).json({
      error: 'Operator ID must be 3-20 characters and contain only letters, numbers, hyphens, and underscores'
    });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Passcode is required'
    });
  }

  if (password.length < 8 || !/\d/.test(password)) {
    return res.status(400).json({
      error: 'Passcode must be at least 8 characters and contain at least one number'
    });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database offline'
    });
  }

  try {
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      return res.status(409).json({
        error: 'Operator ID already taken'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      username: trimmedUsername,
      passwordHash,
      role: 'operator'
    });

    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'arbiter-dev-secret');
    if (!secret) {
      console.error('[AUTH ERROR] Missing secure JWT_SECRET in production environment');
      return res.status(500).json({ error: 'Internal server error' });
    }

    const token = jwt.sign(
      { username: user.username, role: user.role },
      secret,
      { expiresIn: '8h' }
    );

    return res.status(201).json({
      username: user.username,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('[AUTH] Registration failed:', sanitizeLog(error.message));
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
