const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_access_secret_change_immediately_in_prod_64bytes';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_fallback_refresh_secret_change_immediately_in_prod_64bytes';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generates a short-lived JWT Access Token (stored in memory or HttpOnly cookie)
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'secure-ecommerce-api',
      audience: 'secure-ecommerce-client',
    }
  );
}

/**
 * Generates a Refresh Token with a unique jti for Token Rotation
 */
function generateRefreshToken(user) {
  const jti = crypto.randomUUID();
  return jwt.sign(
    {
      sub: user.id,
      jti,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'secure-ecommerce-api',
      audience: 'secure-ecommerce-client',
    }
  );
}

/**
 * Hashes a refresh token using SHA-256 before storing in the database
 * so even a DB read leak cannot replay refresh tokens.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'secure-ecommerce-api',
    audience: 'secure-ecommerce-client',
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: 'secure-ecommerce-api',
    audience: 'secure-ecommerce-client',
  });
}

/**
 * Returns secure cookie configuration adapted for Localhost vs Production cross-domain hosting (Vercel + Render)
 */
function getCookieOptions(maxAgeMs) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true, // Prevents client-side JS (XSS) from reading the cookie
    secure: isProd, // HTTPS only in production
    sameSite: isProd ? 'none' : 'lax', // 'none' + secure allows Vercel -> Render cross-origin cookies, 'lax' for local dev
    maxAge: maxAgeMs,
    path: '/',
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  // Access Token Cookie: 15 minutes
  res.cookie('access_token', accessToken, getCookieOptions(15 * 60 * 1000));
  // Refresh Token Cookie: 7 days (restricted to auth endpoints for defense-in-depth)
  res.cookie('refresh_token', refreshToken, {
    ...getCookieOptions(7 * 24 * 60 * 60 * 1000),
    path: '/api/auth',
  });
}

function clearAuthCookies(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
  });
}

/**
 * Strictly picks only allowed keys from an object to prevent Mass Assignment vulnerabilities
 */
function pickAllowedFields(source, allowedKeys) {
  const sanitized = {};
  if (!source || typeof source !== 'object') return sanitized;
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      sanitized[key] = source[key];
    }
  }
  return sanitized;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  pickAllowedFields,
};

