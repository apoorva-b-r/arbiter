const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password are required'
    });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database offline'
    });
  }

  try {
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        error: 'Invalid operator ID or passcode'
      });
    }

    const token = jwt.sign(
      { username: user.username, role: user.role },
      process.env.JWT_SECRET || 'arbiter-dev-secret',
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      username: user.username,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('[AUTH] Login failed:', error.message);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
