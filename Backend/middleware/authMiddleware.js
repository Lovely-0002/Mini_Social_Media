const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  try {
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token && req.header('Authorization')) {
      const authHeader = req.header('Authorization');
      if (authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
    }

    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = jwt.verify(token, JWT_SECRET);
    
    // Handle both possible payload structures
    req.userId = payload.id || payload.userId;
    req.userEmail = payload.email;
    
    if (!req.userId) {
      return res.status(401).json({ error: 'Invalid token structure' });
    }
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;