// models/orderModel.js

const ORDER_STATUSES = ['pending', 'checking', 'completed', 'rejected'];

const buildOrder = ({ userId, imageId, imageName, totalAmount }) => {
  const now = new Date().toISOString();
  return {
    userId,
    imageId,
    imageName,
    totalAmount,
    status: 'pending',
    slipUrl: null,
    createdAt: now,
    updatedAt: now,
  };
};

const isValidTransition = (from, to) => {
  const allowed = {
    pending:   ['checking'],
    checking:  ['completed', 'rejected'],
    completed: [],
    rejected:  ['checking'],
  };
  return (allowed[from] || []).includes(to);
};

module.exports = { ORDER_STATUSES, buildOrder, isValidTransition };