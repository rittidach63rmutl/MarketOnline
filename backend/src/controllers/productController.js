const prisma = require('../config/prisma');
const { pickAllowedFields } = require('../utils/security');

/**
 * GET /api/products
 * Public Storefront Catalog with parameterized search and category filter
 */
async function getProducts(req, res, next) {
  try {
    const { search, category } = req.query;

    const where = {};

    if (search && typeof search === 'string' && search.trim() !== '') {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (category && typeof category === 'string' && category.trim() !== '' && category !== 'ALL') {
      where.category = {
        slug: category.trim(),
      };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      status: 'success',
      data: { products },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/products/categories
 * Public list of product categories
 */
async function getCategories(req, res, next) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({
      status: 'success',
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/products/:id
 */
async function getProductById(req, res, next) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        status: 'error',
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/products (Admin Only)
 */
async function createProduct(req, res, next) {
  try {
    const dto = pickAllowedFields(req.body, [
      'name',
      'description',
      'price',
      'stock',
      'imageUrl',
      'categoryId',
    ]);

    const categoryExists = await prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!categoryExists) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_CATEGORY',
        message: 'Selected category does not exist.',
      });
    }

    const product = await prisma.product.create({
      data: dto,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Product created successfully.',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/products/:id (Admin Only)
 */
async function updateProduct(req, res, next) {
  try {
    const dto = pickAllowedFields(req.body, [
      'name',
      'description',
      'price',
      'stock',
      'imageUrl',
      'categoryId',
    ]);

    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found.',
      });
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: dto,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Product updated successfully.',
      data: { product: updated },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/products/:id (Admin Only)
 */
async function deleteProduct(req, res, next) {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { orderItems: { take: 1 } },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found.',
      });
    }

    if (existing.orderItems.length > 0) {
      return res.status(409).json({
        status: 'error',
        code: 'PRODUCT_IN_USE',
        message: 'Cannot delete a product that is referenced in existing customer orders. Set stock to 0 instead.',
      });
    }

    await prisma.product.delete({
      where: { id: req.params.id },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

