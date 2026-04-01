// services/imageService.js
// All image-related API calls.

import api from "./api";
import { getToken } from "./authService";

/**
 * GET /images  — fetch gallery images with optional filters.
 * @param {{ category?: string, search?: string }} params
 * @returns {Array}
 */
export const getImages = async ({ category, search, tag, sellerName } = {}) => {
  const params = new URLSearchParams();
  if (category && category !== "All") params.set("category", category.toLowerCase());

  // Smart search — detect if searching by tag (#tag) or user (@user)
  if (search) {
    if (search.startsWith('#')) {
      params.set("tag", search.slice(1).trim());
    } else if (search.startsWith('@')) {
      params.set("sellerName", search.slice(1).trim());
    } else {
      params.set("search", search);
    }
  }

  if (tag) params.set("tag", tag);
  if (sellerName) params.set("sellerName", sellerName);

  const { data } = await api.get(`/images?${params}`);
  return data.data?.images || [];
};

/**
 * GET /images/:id  — fetch a single image's full details.
 * @param {string} imageId
 * @returns {object}
 */
export const getImageById = async (imageId) => {
  const { data } = await api.get(`/images/${imageId}`);
  if (!data.success) throw new Error(data.message || "Image not found.");
  return data.data;
};

/**
 * GET /images/my  — fetch images uploaded by the current seller.
 * @returns {Array}
 */
export const getMyImages = async () => {
  const { data } = await api.get("/images/my");
  return data.data?.images || [];
};

/**
 * DELETE /images/:id  — admin delete an image.
 * @param {string} imageId
 */
export const deleteImage = async (imageId) => {
  const { data } = await api.delete(`/images/${imageId}`);
  if (!data.success) throw new Error(data.message || "Delete failed.");
};

/**
 * POST /images/upload  — multipart form upload with XHR for progress tracking.
 * @param {File}   file
 * @param {object} meta  { imageName, description, price, category, tags }
 * @param {(pct: number) => void} onProgress  — called with 0–100
 * @returns {Promise<{ imageId, watermarkUrl }>}
 */
export const uploadImage = (file, meta, onProgress) =>
  new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("imageName",   meta.imageName.trim());
    form.append("description", meta.description?.trim() || "");
    form.append("price",       String(meta.price || 0));
    form.append("category",    meta.category);
    form.append("tags",        JSON.stringify(meta.tags || []));

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable)
        onProgress?.(Math.round((e.loaded / e.total) * 90));
    });

    xhr.addEventListener("load", () => {
      onProgress?.(100);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve(data.data);
        } else {
          const details = Array.isArray(data.details)
            ? data.details.map((d) => d.msg).join(" · ")
            : "";
          reject(new Error(details || data.message || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error("Unexpected server response."));
      }
    });

    xhr.addEventListener("error",  () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("abort",  () => reject(new Error("Upload cancelled.")));

    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
    xhr.open("POST", `${apiBase}/images/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${getToken()}`);
    xhr.send(form);

    // Expose abort handle via a non-standard property so callers can cancel
    uploadImage._lastXhr = xhr;
  });

/** Cancel the last in-flight uploadImage request. */
uploadImage.cancel = () => uploadImage._lastXhr?.abort();

/**
 * GET /images/search/users?q=  — search users by username
 */
export const searchUsersByName = async (query) => {
  const { data } = await api.get(`/images/search/users?q=${encodeURIComponent(query)}`);
  return data.data?.users || [];
};
