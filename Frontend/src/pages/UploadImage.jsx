// pages/UploadImage.jsx
// Image upload form for sellers.

import { useState, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useUpload } from "../hooks/useUpload";
import "../assets/styles/UploadPhoto.css";

const CATEGORIES = [
  { id: "nature",       label: "Nature",       emoji: "🌿" },
  { id: "architecture", label: "Architecture", emoji: "🏛" },
  { id: "people",       label: "People",       emoji: "👤" },
  { id: "animals",      label: "Animals",      emoji: "🐾" },
  { id: "technology",   label: "Technology",   emoji: "💻" },
  { id: "food",         label: "Food",         emoji: "🍕" },
  { id: "travel",       label: "Travel",       emoji: "✈" },
  { id: "abstract",     label: "Abstract",     emoji: "🌀" },
  { id: "fashion",      label: "Fashion",      emoji: "👗" },
  { id: "sports",       label: "Sports",       emoji: "⚽" },
  { id: "illustration", label: "Illustration", emoji: "🎨" },
  { id: "other",        label: "Other",        emoji: "✦" },
];

const DEFAULT_TAGS  = ["art work", "3d render", "landscape", "portrait", "abstract", "photography", "digital art", "illustration"];
const MAX_FILE_MB   = 20;
const MAX_FILE_B    = MAX_FILE_MB * 1024 * 1024;
const ALLOWED_MIME  = ["image/jpeg", "image/png", "image/webp", "image/tiff"];

export default function UploadImage({ onBack, onSuccess }) {
  const { user } = useAuth();
  const { progress, uploading, uploadError, uploadDone, result, start, cancel, reset } = useUpload();

  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [fileError,   setFileError]   = useState("");
  const [dragOver,    setDragOver]    = useState(false);

  const [imageName,    setImageName]    = useState("");
  const [description,  setDescription]  = useState("");
  const [price,        setPrice]        = useState("");
  const [category,     setCategory]     = useState("");

  const [activeTags,   setActiveTags]   = useState(["photography"]);
  const [customTags,   setCustomTags]   = useState([]);
  const [customInput,  setCustomInput]  = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  const fileRef = useRef(null);

  const validateAndSetFile = (f) => {
    if (!f) return;
    setFileError("");
    if (!ALLOWED_MIME.includes(f.type)) { setFileError("Only JPEG, PNG, WEBP or TIFF files are allowed."); return; }
    if (f.size > MAX_FILE_B)           { setFileError(`File too large — max ${MAX_FILE_MB} MB.`); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); validateAndSetFile(e.dataTransfer.files[0]); }, []);

  const toggleTag   = (t) => setActiveTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  const addCustomTag = () => {
    const val = customInput.trim().toLowerCase();
    if (val && !customTags.includes(val) && !DEFAULT_TAGS.includes(val)) {
      setCustomTags((p) => [...p, val]);
      setActiveTags((p) => [...p, val]);
    }
    setCustomInput(""); setShowTagInput(false);
  };

  const handleUpload = () => {
    if (!isReady || uploading) return;
    start(file, { imageName, description, price, category, tags: activeTags });
  };

  const clearAll = () => {
    reset();
    setFile(null); setPreview(null); setFileError("");
    setImageName(""); setDescription(""); setPrice(""); setCategory("");
    setActiveTags(["photography"]); setCustomTags([]);
  };

  const isReady = !!file && imageName.trim().length >= 3 && category !== "";

  // ── Success screen ─────────────────────────────────────────
  if (uploadDone) {
    return (
      <div className="up-page">
        <nav className="up-header">
          <button className="up-back-btn" onClick={onBack}>← Home</button>
          <div className="up-header-center"><h1>Upload Image</h1></div>
          <div style={{ width: 80 }} />
        </nav>

        <div className="success-screen">
          <div className="success-ring"><div className="success-checkmark">✓</div></div>
          <h2 className="success-title">Image Submitted!</h2>
          <p className="success-sub">
            Your image is <strong>pending admin review</strong> and will appear in the marketplace once approved — usually within 24 hours.
          </p>

          {result?.watermarkUrl && <img className="success-thumb" src={result.watermarkUrl} alt="Uploaded preview" />}

          <div className="success-info-box">
            <div className="success-info-row"><span>Image Name</span><strong>{imageName}</strong></div>
            <div className="success-info-row">
              <span>Category</span>
              <span>{CATEGORIES.find((c) => c.id === category)?.emoji} {CATEGORIES.find((c) => c.id === category)?.label}</span>
            </div>
            <div className="success-info-row">
              <span>Price</span>
              <span>{!price || price === "0" ? "Free" : `฿${Number(price).toLocaleString("th-TH")}`}</span>
            </div>
            <div className="success-info-row"><span>Status</span><span className="badge-pending">⏳ Pending Review</span></div>
            {result?.imageId && <div className="success-info-row"><span>Image ID</span><code>{result.imageId}</code></div>}
          </div>

          <div className="success-actions">
            <button className="btn-cancel" onClick={clearAll}>Upload Another</button>
            {result?.imageId && onSuccess && (
              <button className="btn-upload" onClick={() => onSuccess(result.imageId)}>View Image →</button>
            )}
            <button className="btn-upload" onClick={onBack}>Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Upload form ────────────────────────────────────────────
  return (
    <div className="up-page">
      <nav className="up-header">
        <button className="up-back-btn" onClick={uploading ? undefined : onBack} disabled={uploading}>← Back</button>
        <div className="up-header-center">
          <h1>Upload Image</h1>
          <p className="up-subtitle">All uploads are reviewed before going live</p>
        </div>
        <button className="up-refresh-btn" onClick={clearAll} disabled={uploading} title="Clear form">↺ Clear</button>
      </nav>

      <div className="main">
        <div className="upload-card">
          {/* Left panel */}
          <div className="left-col">
            <div
              className={`dropzone${preview ? " has-image" : ""}${dragOver ? " drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => !uploading && fileRef.current.click()}
            >
              {preview && <img src={preview} alt="preview" />}
              {!preview && (
                <>
                  <div className="corner tl" /><div className="corner tr" />
                  <div className="corner bl" /><div className="corner br" />
                  <div className="dropzone-icon">
                    <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <div className="dropzone-text">
                    <strong>Click or drag</strong> to upload
                    <span className="dropzone-sub">PNG · JPG · WEBP · TIFF — max {MAX_FILE_MB}MB</span>
                  </div>
                </>
              )}
              {preview && !uploading && (
                <div className="dropzone-overlay">
                  <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, stroke: "#fff", fill: "none", strokeWidth: 2 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <div style={{ color: "#fff", fontSize: 13 }}>Change image</div>
                </div>
              )}
              {uploading && (
                <div className="dropzone-uploading">
                  <div className="up-spinner" /><span>{progress}%</span>
                </div>
              )}
            </div>

            <input ref={fileRef} type="file" accept={ALLOWED_MIME.join(",")} style={{ display: "none" }} onChange={(e) => validateAndSetFile(e.target.files[0])} />

            {fileError && <div className="field-error">⚠ {fileError}</div>}

            <div className="warn-note">
              <strong>Content Policy:</strong> No violence, self-harm, sexual or sensitive content. Violations result in rejection and may suspend your account.
            </div>

            <div>
              <div className="progress-label">
                <span>Upload Status</span>
                <span style={{ color: uploadError ? "#f87171" : progress > 0 ? "#4fc3c3" : "var(--muted)" }}>{Math.round(progress)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progress}%`, background: uploadError ? "#f87171" : progress === 100 ? "#6ee7b7" : "#4fc3c3" }} />
              </div>
              <div className="progress-status">
                {uploading ? `Uploading… ${progress}%` : uploadError ? "Upload failed — see error below" : file ? "Ready to publish" : "Awaiting image…"}
              </div>
            </div>

            {uploadError && <div className="upload-error-box"><strong>✗ Upload Failed</strong><p>{uploadError}</p></div>}
          </div>

          {/* Right panel */}
          <div className="right-col">
            <div className="field">
              <div className="field-label">name of your picture<span className="field-required"> *</span></div>
              <input type="text" placeholder="e.g. Mountain at Dusk" value={imageName} onChange={(e) => setImageName(e.target.value)} maxLength={100} disabled={uploading} />
              <div className="char-count" style={{ color: imageName.length > 0 && imageName.length < 3 ? "#f87171" : undefined }}>
                {imageName.length}/100 {imageName.length > 0 && imageName.length < 3 && "— min 3 characters"}
              </div>
            </div>

            <div className="field">
              <div className="field-label">description</div>
              <textarea rows={3} placeholder="Describe the mood, story, or context behind your image…" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} disabled={uploading} />
              <div className="char-count">{description.length}/1000</div>
            </div>

            <div className="field">
              <div className="field-label">category<span className="field-required"> *</span></div>
              <div className="category-chip-grid">
                {CATEGORIES.map(({ id, label, emoji }) => (
                  <button key={id} type="button" className={`cat-chip${category === id ? " active" : ""}`} onClick={() => !uploading && setCategory(id)} disabled={uploading}>
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <div className="field-label">price (THB)</div>
              <div className="price-row">
                <div className="price-input-wrap">
                  <span className="price-symbol">฿</span>
                  <input type="number" min="20" max="100000" step="1" placeholder="20" value={price} onChange={(e) => setPrice(e.target.value)} disabled={uploading} />
                </div>
                <button type="button" className={`btn-free${price === 20 ? " active" : ""}`} onClick={() => setPrice("20")} disabled={uploading}>Min</button>
              </div>
              <div className="price-hint">Set minimum price at 20 THB</div>
            </div>

            <div className="style-section">
              <div className="style-label">style tags</div>
              <div className="style-chips">
                {[...DEFAULT_TAGS, ...customTags].map((tag) => (
                  <button key={tag} type="button" className={`chip${activeTags.includes(tag) ? " active" : ""}`} onClick={() => !uploading && toggleTag(tag)} disabled={uploading}>{tag}</button>
                ))}
                <button type="button" className="chip-add" onClick={() => setShowTagInput((v) => !v)} disabled={uploading}>
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: "currentColor", fill: "none", strokeWidth: 2.5 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  add tag
                </button>
              </div>
              {showTagInput && (
                <div className="custom-tag-row">
                  <input type="text" placeholder="Type your custom tag…" value={customInput} onChange={(e) => setCustomInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomTag()} autoFocus />
                  <button type="button" onClick={addCustomTag}>Add</button>
                </div>
              )}
            </div>

            <div className="review-notice">
              <span className="review-icon">🛡</span>
              <div>
                <strong>Admin Review Required</strong>
                <p>All uploads are manually reviewed before going live. You'll be notified once approved or if changes are needed.</p>
              </div>
            </div>

            {!isReady && !uploading && (file || imageName || category) && (
              <div className="validation-hints">
                {!file                       && <span>⬡ Select an image file</span>}
                {imageName.trim().length < 3 && <span>⬡ Image name must be at least 3 characters</span>}
                {!category                   && <span>⬡ Select a category</span>}
              </div>
            )}

            <div className="actions">
              {uploading
                ? <button type="button" className="btn-cancel" onClick={cancel}>✕ Cancel Upload</button>
                : <button type="button" className="btn-cancel" onClick={clearAll}>Clear</button>
              }
              <button type="button" className="btn-upload" disabled={!isReady || uploading} onClick={handleUpload}>
                {uploading ? `Uploading… ${progress}%` : "Publish Image"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
