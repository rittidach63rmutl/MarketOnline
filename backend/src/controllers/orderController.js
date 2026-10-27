const prisma = require('../config/prisma');
const { pickAllowedFields } = require('../utils/security');

/**
 * POST /api/orders
 * Authenticated Customer Checkout
 * SECURITY: Never trust unit prices from the client request! Always compute totalAmount
 * using authoritative prices from the database inside an atomic transaction.
 */
async function createOrder(req, res, next) {
  try {
    const dto = pickAllowedFields(req.body, [
      'recipientName',
      'recipientPhone',
      'shippingAddress',
      'items',
    ]);

    // Deduplicate productIds if client sent multiple entries for the same product
    const mergedItemsMap = new Map();
    for (const item of dto.items) {
      const currentQty = mergedItemsMap.get(item.productId) || 0;
      mergedItemsMap.set(item.productId, currentQty + Number(item.quantity));
    }

    const productIds = Array.from(mergedItemsMap.keys());

    // Execute atomic transaction: verify stock, decrement stock, calculate authoritative total, create Order
    const createdOrder = await prisma.$transaction(async (tx) => {
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (dbProducts.length !== productIds.length) {
        const err = new Error('One or more selected products no longer exist.');
        err.statusCode = 400;
        throw err;
      }

      let calculatedTotal = 0;
      const orderItemsData = [];

      for (const product of dbProducts) {
        const requestedQty = mergedItemsMap.get(product.id);
        if (product.stock < requestedQty) {
          const err = new Error(
            `Insufficient stock for "${product.name}" (Available: ${product.stock}, Requested: ${requestedQty}).`
          );
          err.statusCode = 409;
          throw err;
        }

        // Decrement stock atomically
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: requestedQty } },
        });

        calculatedTotal += product.price * requestedQty;
        orderItemsData.push({
          productId: product.id,
          quantity: requestedQty,
          unitPrice: product.price,
        });
      }

      return tx.order.create({
        data: {
          userId: req.user.id,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          shippingAddress: dto.shippingAddress,
          totalAmount: Number(calculatedTotal.toFixed(2)),
          status: 'PENDING',
          paymentStatus: 'PAID', // Simulated instant payment verification for checkout demo
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, imageUrl: true },
              },
            },
          },
        },
      });
    });

    return res.status(201).json({
      status: 'success',
      message: 'Order placed securely.',
      data: { order: createdOrder },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/orders/my-orders
 * Returns only orders belonging to the authenticated user (Prevents IDOR / Broken Object Level Authorization)
 */
async function getMyOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, imageUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      status: 'success',
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/orders/admin/all (Admin Only)
 * Returns all orders + dashboard summary metrics
 */
async function getAllOrdersAdmin(req, res, next) {
  try {
    const [orders, productCount, customerCount] = await Promise.all([
      prisma.order.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, imageUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);

    const totalRevenue = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return res.status(200).json({
      status: 'success',
      data: {
        metrics: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalOrders: orders.length,
          totalProducts: productCount,
          totalCustomers: customerCount,
        },
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/orders/admin/:id/status (Admin Only)
 * Updates order status and/or paymentStatus
 */
async function updateOrderStatusAdmin(req, res, next) {
  try {
    const dto = pickAllowedFields(req.body, ['status', 'paymentStatus']);

    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found.',
      });
    }

    // If transitioning to CANCELLED from a non-cancelled state, restore product stock atomically
    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (dto.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id: req.params.id },
        data: dto,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, imageUrl: true } },
            },
          },
        },
      });
    });

    return res.status(200).json({
      status: 'success',
      message: 'Order status updated.',
      data: { order: updatedOrder },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
};

