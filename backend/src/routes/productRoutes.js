const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const {
  productQueryValidation,
  productCreateValidation,
  productUpdateValidation,
  uuidParamValidation,
} = require('../middleware/validators');

// Public Storefront Endpoints
router.get('/categories', productController.getCategories);
router.get('/', productQueryValidation, productController.getProducts);
router.get('/:id', uuidParamValidation, productController.getProductById);

// Admin-Only Product CRUD Endpoints (Protected by RBAC: verifyToken + requireAdmin)
router.post('/', verifyToken, requireAdmin, productCreateValidation, productController.createProduct);
router.put('/:id', verifyToken, requireAdmin, productUpdateValidation, productController.updateProduct);
router.delete('/:id', verifyToken, requireAdmin, uuidParamValidation, productController.deleteProduct);

module.exports = router;

