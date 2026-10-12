const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['authorization'];

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Login required' });
  }

  const token = authHeader.slice(7).trim();
  const secret = process.env.JWT_SECRET || 'arbiter-dev-secret';

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Login required' });
  }
}

module.exports = requireAuth;
