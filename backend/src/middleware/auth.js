const prisma = require('../config/prisma');
const { verifyAccessToken } = require('../utils/security');

/**
 * Middleware: Verify JWT Access Token from HttpOnly Cookie or Authorization Bearer Header
 * Attaches sanitized user object to req.user
 */
async function verifyToken(req, res, next) {
  try {
    let token = null;

    // 1. Primary: Read from HttpOnly Cookie (Immune to XSS extraction)
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }
    // 2. Fallback: Read from Authorization Bearer header (In-memory token from Pinia)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_MISSING',
        message: 'Authentication required. Please log in.',
      });
    }

    const decoded = verifyAccessToken(token);

    if (decoded.type !== 'access') {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN_TYPE',
        message: 'Invalid authentication token type.',
      });
    }

    // Verify user still exists in DB and is not locked
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lockUntil: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'Account associated with this session no longer exists.',
      });
    }

    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      return res.status(423).json({
        status: 'error',
        code: 'ACCOUNT_LOCKED',
        message: 'Account is temporarily locked due to security policy.',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Access token has expired. Please refresh your session.',
      });
    }
    return res.status(401).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Invalid or tampered authentication token.',
    });
  }
}

/**
 * Middleware: Role-Based Access Control (RBAC) for Admin-only endpoints
 * Must always be chained AFTER verifyToken
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN_ADMIN_ONLY',
      message: 'Access denied. Administrator privileges are required for this resource.',
    });
  }
  next();
}

module.exports = {
  verifyToken,
  requireAdmin,
};

