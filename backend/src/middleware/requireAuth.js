const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['authorization'];

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Login required' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Login required' });
  }
  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET || (isProd ? null : 'arbiter-dev-secret');
  if (!secret) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Login required' });
  }
}

module.exports = requireAuth;
