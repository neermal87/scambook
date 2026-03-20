const jwt = require('jsonwebtoken');

/**
 * Verifies JWT from Authorization: Bearer <token>
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }
    const decoded = jwt.verify(token, secret);
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}

/**
 * Optional JWT — attaches req.user if valid token present
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, secret);
    req.user = { id: decoded.id, email: decoded.email };
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { authenticateToken, optionalAuth };
