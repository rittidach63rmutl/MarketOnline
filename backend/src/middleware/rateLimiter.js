const rateLimit = require('express-rate-limit');

// General API Rate Limiter: 120 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP address. Please wait 15 minutes and try again.',
  },
});

// Strict Authentication Limiter (/api/auth/login, /api/auth/register): 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts from this IP. Access temporarily blocked for 15 minutes.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};

