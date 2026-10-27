require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');

const { apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust first proxy (Essential for Render / Koyeb / Reverse Proxies so express-rate-limit & secure cookies work accurately)
app.set('trust proxy', 1);

// 1. Security HTTP Headers via Helmet (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"], // Equivalent to X-Frame-Options: DENY (Clickjacking protection)
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
  })
);

// 2. Dynamic CORS Configuration from Environment Variables
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server or health check requests with no origin header
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const corsError = new Error('Origin not allowed by CORS security policy.');
      corsError.statusCode = 403;
      return callback(corsError);
    },
    credentials: true, // Required for HttpOnly Cookies across origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 3. Body Parser with strict payload size limit (16KB) to mitigate DoS payload attacks
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// 4. Cookie Parser for reading HttpOnly JWT cookies
app.use(cookieParser());

// 5. HTTP Parameter Pollution (HPP) Protection
app.use(hpp());

// 6. Global Rate Limiting for all /api routes
app.use('/api', apiLimiter);

// Health Check Endpoint for Render / Koyeb Zero-Downtime Probes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'secure-ecommerce-backend',
    timestamp: new Date().toISOString(),
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 'ENDPOINT_NOT_FOUND',
    message: 'The requested API endpoint does not exist.',
  });
});

// Global Centralized Error Handler (OWASP A05: Never leak stack traces or internal DB details to clients)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Log internally on server
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Security/Server Error] ${req.method} ${req.originalUrl}:`, err.message);
  }

  res.status(statusCode).json({
    status: 'error',
    code: err.code || 'INTERNAL_ERROR',
    message:
      statusCode === 500
        ? 'An unexpected error occurred on the server. Please try again later.'
        : err.message,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🛡️  Security-First Backend running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

module.exports = app;

