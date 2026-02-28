// utils/responseHelp.js
/**
 * Standard JSON response wrappers.
 * All API responses follow this shape so the client can handle them uniformly.
 *
 * Success: { success: true,  data: <payload> }
 * Error:   { success: false, error: <message> }
 */

const successResponse = (data) => ({
  success: true,
  data,
});

const errorResponse = (message) => ({
  success: false,
  error: message,
});

module.exports = { successResponse, errorResponse };