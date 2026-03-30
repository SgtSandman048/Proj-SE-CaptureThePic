// hooks/useUpload.js
// Encapsulates the XHR upload flow used by the UploadImage page.

import { useState, useRef } from "react";
import { uploadImage } from "../services/imageService";

export function useUpload() {
  const [progress,    setProgress]    = useState(0);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadDone,  setUploadDone]  = useState(false);
  const [result,      setResult]      = useState(null); // { imageId, watermarkUrl }

  const start = async (file, meta) => {
    setUploading(true);
    setUploadError("");
    setProgress(0);
    setUploadDone(false);
    try {
      const data = await uploadImage(file, meta, setProgress);
      setResult(data);
      setUploadDone(true);
    } catch (err) {
      if (err.message !== "Upload cancelled.") {
        setUploadError(err.message);
      }
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const cancel = () => {
    uploadImage.cancel();
    setUploading(false);
    setProgress(0);
  };

  const reset = () => {
    cancel();
    setProgress(0);
    setUploading(false);
    setUploadError("");
    setUploadDone(false);
    setResult(null);
  };

  return { progress, uploading, uploadError, uploadDone, result, start, cancel, reset };
}

export default useUpload;
