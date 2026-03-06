// src/services/orderService.js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
const getToken = () => localStorage.getItem("accessToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

export const createOrder = async (imageId) => {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ imageId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create order");
  return data.data;
};

export const uploadSlip = async (orderId, file) => {
  const form = new FormData();
  form.append("slipFile", file);
  const res = await fetch(`${API_BASE}/orders/${orderId}/upload-slip`, {
    method: "PATCH",
    headers: authHeaders(),
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to upload slip");
  return data.data;
};

export const getMyOrders = async () => {
  const res = await fetch(`${API_BASE}/orders/my-orders`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch orders");
  return data.data;
};

export const getDownloadUrl = async (orderId) => {
  const res = await fetch(`${API_BASE}/orders/${orderId}/download`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Download unavailable");
  return data.data.downloadUrl;
};
