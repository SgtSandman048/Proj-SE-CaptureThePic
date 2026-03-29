// utils/format.js
// Shared formatting helpers used across the app. 

/**
 * Format a number as Thai Baht currency.
 * @param {number} n
 * @returns {string}  e.g. "฿1,200"
 */
export const formatTHB = (n) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n ?? 0);

/**
 * Format a date value to "DD Mon YYYY".
 * Accepts ISO strings, Unix ms, or Firestore Timestamp objects.
 * @param {string|number|{seconds:number}|{_seconds:number}|null} iso
 * @returns {string}
 */
export const formatDate = (iso) => {
  if (!iso) return "—";
  let d;
  // Firestore REST: { _seconds, _nanoseconds }
  if (iso?._seconds) d = new Date(iso._seconds * 1000);
  // Firestore SDK: { seconds, nanoseconds }
  else if (iso?.seconds) d = new Date(iso.seconds * 1000);
  // Plain ISO string or Unix ms
  else d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Format file size bytes to human-readable string.
 * @param {number|undefined} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
