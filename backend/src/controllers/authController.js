const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  pickAllowedFields,
} = require('../utils/security');

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes temporary lockout

/**
 * POST /api/auth/register
 * Registers a CUSTOMER account (Role cannot be mass-assigned from request body)
 */
async function register(req, res, next) {
  try {
    // Prevent Mass Assignment: Only allow 'name', 'email', 'password'
    const dto = pickAllowedFields(req.body, ['name', 'email', 'password']);
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        code: 'EMAIL_EXISTS',
        message: 'An account with this email address already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        name: dto.name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'CUSTOMER', // Explicitly hardcoded to prevent privilege escalation
      },
    });

    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    await prisma.user.update({
      where: { id: newUser.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      status: 'success',
      message: 'Account created successfully.',
      data: {
        accessToken, // For in-memory Pinia store only (never LocalStorage)
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticates user with Brute-Force Lockout Protection (5 failed attempts = 15m lock)
 */
async function login(req, res, next) {
  try {
    const dto = pickAllowedFields(req.body, ['email', 'password']);
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Generic error message to prevent User Enumeration attacks
    const invalidCredentialsResponse = {
      status: 'error',
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    };

    if (!user) {
      // Mitigate timing attacks by executing a dummy bcrypt compare
      await bcrypt.compare(dto.password, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oL9S1y2uW');
      return res.status(401).json(invalidCredentialsResponse);
    }

    // Check if account is currently locked
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lockUntil) - new Date()) / 60000);
      return res.status(423).json({
        status: 'error',
        code: 'ACCOUNT_LOCKED',
        message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute(s).`,
      });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
      const lockUntil = shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockUntil,
        },
      });

      if (shouldLock) {
        return res.status(423).json({
          status: 'error',
          code: 'ACCOUNT_LOCKED',
          message: 'Account locked for 15 minutes after 5 consecutive failed login attempts.',
        });
      }

      return res.status(401).json({
        ...invalidCredentialsResponse,
        remainingAttempts: MAX_FAILED_ATTEMPTS - attempts,
      });
    }

    // Successful login: Reset failedLoginAttempts & issue rotated tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
        refreshTokenHash: hashToken(refreshToken),
      },
    });

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      status: 'success',
      message: 'Logged in successfully.',
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Refresh Token Rotation: Validates HttpOnly refresh_token cookie, rotates both tokens,
 * and revokes session if token reuse / tampering is detected.
 */
async function refresh(req, res, next) {
  try {
    const incomingRefreshToken = req.cookies?.refresh_token;

    if (!incomingRefreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({
        status: 'error',
        code: 'REFRESH_TOKEN_MISSING',
        message: 'No active session found. Please log in.',
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(incomingRefreshToken);
    } catch (err) {
      clearAuthCookies(res);
      return res.status(401).json({
        status: 'error',
        code: 'REFRESH_TOKEN_INVALID',
        message: 'Session has expired. Please log in again.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || !user.refreshTokenHash) {
      clearAuthCookies(res);
      return res.status(401).json({
        status: 'error',
        code: 'SESSION_REVOKED',
        message: 'Session is no longer valid.',
      });
    }

    // Token Reuse Detection: Compare incoming token hash with stored hash
    const incomingHash = hashToken(incomingRefreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      // Potential token theft! Revoke all sessions for this user immediately
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      clearAuthCookies(res);
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_REUSE_DETECTED',
        message: 'Security alert: Session invalidated due to suspicious token reuse.',
      });
    }

    // Issue brand new Access + Refresh Token pair (Token Rotation)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(newRefreshToken) },
    });

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({
      status: 'success',
      data: {
        accessToken: newAccessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Clears HttpOnly cookies and invalidates stored refresh token hash in DB
 */
async function logout(req, res, next) {
  try {
    const incomingRefreshToken = req.cookies?.refresh_token;
    if (incomingRefreshToken) {
      try {
        const decoded = verifyRefreshToken(incomingRefreshToken);
        await prisma.user.update({
          where: { id: decoded.sub },
          data: { refreshTokenHash: null },
        });
      } catch (_) {
        // Ignore expired token errors during logout
      }
    }

    clearAuthCookies(res);
    return res.status(200).json({
      status: 'success',
      message: 'Logged out securely.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Always verifies live session & role from Backend Database (Used by Vue Router Guard)
 */
async function getMe(req, res) {
  return res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};

