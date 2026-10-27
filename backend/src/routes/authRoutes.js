const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerValidation, loginValidation } = require('../middleware/validators');

// Public Auth Routes (Protected by strict rate limiter + input validation)
router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);

// Refresh Token Rotation & Logout
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Live Session Verification Endpoint (Used by Frontend Route Guard on every navigation)
router.get('/me', verifyToken, authController.getMe);

module.exports = router;

