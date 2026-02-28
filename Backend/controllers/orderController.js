const orderService = require('../services/orderService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * POST /api/orders
 * Create a new pending order for an image.
 */
const createOrder = async (req, res) => {
  try {
    const { imageId } = req.body;

    if (!imageId) {
      return res.status(400).json(errorResponse('imageId is required'));
    }

    const order = await orderService.createOrder({
      userId: req.user.uid,
      imageId,
    });

    return sendSuccess(res, 201, 'Order created successfully', {
      orderId: order.id,
      totalAmount: order.totalAmount,
      status: order.status,
    });
  } catch (err) {
    if (err.message === 'IMAGE_NOT_FOUND') {
      return sendError(res, 404, 'Image not found');
    }
    if (err.message === 'ALREADY_PURCHASED') {
      return sendError(res, 409, 'You have already purchased this image');
    }
    console.error('[createOrder]', err);
    return sendError(res, 500, 'Failed to create order');
  }
};

/**
 * PATCH /api/orders/:id/upload-slip
 * Upload a payment slip image for an existing pending/checking order.
 */
const uploadSlip = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json(errorResponse('slipFile is required'));
    }

    await orderService.uploadSlip({
      orderId: id,
      userId: req.user.uid,
      file: req.file,
    });

    return sendSuccess(res, 200, 'Slip uploaded, waiting for verification', {
      status: 'checking',
    });
  } catch (err) {
    if (err.message === 'ORDER_NOT_FOUND') {
      return sendError(res, 404, 'Order not found');
    }
    if (err.message === 'FORBIDDEN') {
      return sendError(res, 403, 'Access denied');
    }
    if (err.message === 'INVALID_STATUS') {
      return sendError(res, 409, 'Order is not in a valid state for slip upload');
    }
    console.error('[uploadSlip]', err);
    return sendError(res, 500, 'Failed to upload slip');
  }
};

/**
 * GET /api/orders/my-orders
 * Return the order history for the authenticated user.
 */
const getMyOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrdersByUser(req.user.uid);

    const data = orders.map((o) => ({
      orderId: o.id,
      imageName: o.imageName,
      status: o.status,
      orderDate: o.createdAt,
    }));

    return sendSuccess(res, 200, 'Orders retrieved successfully', data);
  } catch (err) {
    console.error('[getMyOrders]', err);
    return sendError(res, 500, 'Failed to fetch orders');
  }
};

/**
 * GET /api/orders/:id/download
 * Return the original Cloudinary URL — only accessible when status is 'completed'.
 */
const getDownloadUrl = async (req, res) => {
  try {
    const { id } = req.params;

    const downloadUrl = await orderService.getDownloadUrl({
      orderId: id,
      userId: req.user.uid,
    });

    return sendSuccess(res, 200, 'Download URL retrieved', { downloadUrl });
  } catch (err) {
    if (err.message === 'ORDER_NOT_FOUND') {
      return sendError(res, 404, 'Order not found');
    }
    if (err.message === 'FORBIDDEN') {
      return sendError(res, 403, 'Access denied');
    }
    if (err.message === 'NOT_COMPLETED') {
      return sendError(res, 403, 'Order is not yet completed');
    }
    console.error('[getDownloadUrl]', err);
    return sendError(res, 500, 'Failed to get download URL');
  }
};

module.exports = { createOrder, uploadSlip, getMyOrders, getDownloadUrl };
