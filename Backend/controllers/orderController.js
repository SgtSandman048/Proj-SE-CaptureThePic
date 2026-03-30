// controllers/orderController.js

const orderService = require('../services/orderService');
const { sendSuccess, sendError } = require('../utils/apiResponse');


// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { imageId } = req.body;

    if (!imageId) {
      //return res.status(400).json(errorResponse('imageId is required'));
      return sendError(res, 400, 'imageId is required');
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


// PATCH /api/orders/:id/upload-slip
const uploadSlip = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return sendError(res, 400, 'slipFile is required');
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


// GET /api/orders/my-orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrdersByUser(req.user.uid);

    const data = orders.map((o) => ({
      orderId: o.id,
      imageId: o.imageId,
      imageName: o.imageName,
      price: o.totalAmount,
      status: o.status,
      adminNote: o.adminNote,
      orderDate: o.createdAt,
    }));

    return sendSuccess(res, 200, 'Orders retrieved successfully', data);
  } catch (err) {
    console.error('[getMyOrders]', err);
    return sendError(res, 500, 'Failed to fetch orders');
  }
};

// GET /api/orders/:id/download
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
    if (err.message === 'IMAGE_NOT_FOUND') {
      return sendError(res, 404, 'Image no longer exists');
    }   
    if (err.message === 'ORIGINAL_NOT_FOUND') {
      return sendError(res, 404, 'Original file not available for this image');
    }
      console.error('[getDownloadUrl]', err);
    return sendError(res, 500, 'Failed to get download URL');
  }
};

//  GET /api/orders/:id/watermark
const getWatermarked = async (req, res) => {
  try {
    const { id } = req.params;

    const downloadUrl = await orderService.getWatermarkedUrl({
      orderId: id,
      userId: req.user.uid,
    });

    return sendSuccess(res, 200, 'Download Watermarked URL retrieved', { downloadUrl });
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
    if (err.message === 'IMAGE_NOT_FOUND') {
      return sendError(res, 404, 'Image no longer exists');
    }   
    if (err.message === 'ORIGINAL_NOT_FOUND') {
      return sendError(res, 404, 'Original file not available for this image');
    }
      console.error('[getDownloadUrl]', err);
    return sendError(res, 500, 'Failed to get download URL');
  }
};


const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await orderService.cancelOrder({ orderId: id, userId: req.user.uid });
    return sendSuccess(res, 200, 'Order cancelled successfully', { status: 'cancelled' });
  } catch (err) {
    if (err.message === 'ORDER_NOT_FOUND') return sendError(res, 404, 'Order not found');
    if (err.message === 'FORBIDDEN') return sendError(res, 403, 'Access denied');
    if (err.message === 'INVALID_STATUS') return sendError(res, 409, 'Only pending orders can be cancelled');
    console.error('[cancelOrder]', err);
    return sendError(res, 500, 'Failed to cancel order');
  }
};

module.exports = { createOrder, uploadSlip, getMyOrders, getDownloadUrl, getWatermarked, cancelOrder };