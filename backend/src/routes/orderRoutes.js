const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const {
  orderCreateValidation,
  orderStatusUpdateValidation,
} = require('../middleware/validators');

// Customer Authenticated Endpoints
router.post('/', verifyToken, orderCreateValidation, orderController.createOrder);
router.get('/my-orders', verifyToken, orderController.getMyOrders);

// Admin-Only Order Management & Dashboard Metrics Endpoints (RBAC Enforced)
router.get('/admin/all', verifyToken, requireAdmin, orderController.getAllOrdersAdmin);
router.patch(
  '/admin/:id/status',
  verifyToken,
  requireAdmin,
  orderStatusUpdateValidation,
  orderController.updateOrderStatusAdmin
);

module.exports = router;

