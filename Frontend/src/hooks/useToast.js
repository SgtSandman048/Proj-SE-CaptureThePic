// hooks/useToast.js

import { useState, useCallback } from "react";

export function useToast(duration = 3000) {
  const [toast, setToast] = useState({ visible: false, msg: "", type: "info" });

  const showToast = useCallback(
    (msg, type = "info") => {
      setToast({ visible: true, msg, type });
      setTimeout(
        () => setToast((prev) => ({ ...prev, visible: false })),
        duration
      );
    },
    [duration]
  );

  return { toast, showToast };
}

export default useToast;
