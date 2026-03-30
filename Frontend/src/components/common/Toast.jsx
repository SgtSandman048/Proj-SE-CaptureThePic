// components/common/Toast.jsx
// Renders a floating toast notification.

import "./Toast.css";

export default function Toast({ toast }) {
  return (
    <div
      className={`toast toast--${toast.type ?? "info"} ${
        toast.visible ? "visible" : ""
      }`}
      aria-live="polite"
    >
      {toast.msg}
    </div>
  );
}
