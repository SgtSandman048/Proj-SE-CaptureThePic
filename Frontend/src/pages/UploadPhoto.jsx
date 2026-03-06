import { useState, useRef, useCallback } from "react";
import "./UploadPhoto.css";

const DEFAULT_CHIPS = [
  "art work", "3d render", "landscape", "portrait",
  "abstract", "photography", "digital art", "illustration",
];

export default function UploadPhoto() {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [picName, setPicName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [activeChips, setActiveChips] = useState(["art work"]);
  const [customChips, setCustomChips] = useState([]);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setProgress(0);
    setUploadDone(false);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const toggleChip = (chip) =>
    setActiveChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );

  const addCustomChip = () => {
    const val = customInput.trim().toLowerCase();
    if (val && !customChips.includes(val) && !DEFAULT_CHIPS.includes(val)) {
      setCustomChips((prev) => [...prev, val]);
      setActiveChips((prev) => [...prev, val]);
    }
    setCustomInput("");
    setShowCustomInput(false);
  };

  const handleUpload = () => {
    if (!preview || !picName) return;
    setUploading(true);
    setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 16;
      if (p >= 100) {
        clearInterval(iv);
        setUploading(false);
        setUploadDone(true);
        p = 100;
      }
      setProgress(Math.min(p, 100));
    }, 200);
  };

  const clearAll = () => {
    setPreview(null);
    setPicName("");
    setDesc("");
    setPrice("");
    setActiveChips(["art work"]);
    setCustomChips([]);
    setProgress(0);
    setUploadDone(false);
    setUploading(false);
  };

  const isReady = preview && picName.trim().length > 0;

  return (
    <div className="page">

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="nav-hamburger">
          <span /><span /><span />
        </div>
        <div className="nav-search">
          <input type="text" placeholder="man eating pizza with dog..." />
          <button className="nav-search-btn">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" />
            </svg>
          </button>
        </div>
        <div className="nav-logo">Imagery</div>
      </nav>

      {/* MAIN */}
      <div className="main">
        <div className="page-title">Upload your photo</div>
        <div className="page-sub">Share your visual story with the Imagery community</div>

        <div className="upload-card">

          {/* LEFT PANEL */}
          <div className="left-col">

            <div
              className={`dropzone${preview ? " has-image" : ""}${dragOver ? " drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}
            >
              {preview && <img src={preview} alt="preview" />}
              {!preview && (
                <>
                  <div className="corner tl" /><div className="corner tr" />
                  <div className="corner bl" /><div className="corner br" />
                  <div className="dropzone-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="dropzone-text">
                    <strong>Click or drag</strong> to upload
                    <span className="dropzone-sub">PNG · JPG · WEBP — max 20MB</span>
                  </div>
                </>
              )}
              {preview && (
                <div className="dropzone-overlay">
                  <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, stroke: "#fff", fill: "none", strokeWidth: 2 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div style={{ color: "#fff", fontSize: 13 }}>Change image</div>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />

            <div className="warn-note">
              <strong>Note:</strong> your picture mustn't include violence, self harm,
              sexual or sensitive content.
            </div>

            <div>
              <div className="progress-label">
                <span>Uploading status</span>
                <span style={{ color: uploadDone ? "var(--accent2)" : "var(--muted)" }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="progress-status">
                {uploadDone ? "Upload complete!" : uploading ? "Uploading..." : preview ? "Ready to upload" : "Awaiting image..."}
              </div>
            </div>

            <div className="user-row">
              <span className="user-label">by user :</span>
              <div className="user-avatar">M</div>
              <div className="user-name">Mambo98</div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="right-col">

            <div className="field">
              <div className="field-label">name of your picture</div>
              <input
                type="text"
                placeholder="e.g. Mountain at Dusk"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                maxLength={80}
              />
              <div className="char-count">{picName.length}/80</div>
            </div>

            <div className="field">
              <div className="field-label">description</div>
              <textarea
                rows={3}
                placeholder="Describe the story, mood, or context behind your image..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={300}
              />
              <div className="char-count">{desc.length}/300</div>
            </div>

            <div className="field">
              <div className="field-label">price</div>
              <div className="price-row">
                <div className="price-input-wrap">
                  <span className="price-symbol">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <button
                  className={`btn-free${price === "0" ? " active" : ""}`}
                  onClick={() => setPrice("0")}
                >
                  set as free
                </button>
              </div>
              <div className="price-hint">Set 0 or click "set as free" to publish at no cost</div>
            </div>

            <div className="style-section">
              <div className="style-label">style tags</div>
              <div className="style-chips">
                {[...DEFAULT_CHIPS, ...customChips].map((chip) => (
                  <button
                    key={chip}
                    className={`chip${activeChips.includes(chip) ? " active" : ""}`}
                    onClick={() => toggleChip(chip)}
                  >
                    {chip}
                  </button>
                ))}
                <button className="chip-add" onClick={() => setShowCustomInput((v) => !v)}>
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: "currentColor", fill: "none", strokeWidth: 2.5 }}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  add tag
                </button>
              </div>
              {showCustomInput && (
                <div className="custom-tag-row">
                  <input
                    type="text"
                    placeholder="Type your custom tag..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomChip()}
                    autoFocus
                  />
                  <button onClick={addCustomChip}>Add</button>
                </div>
              )}
            </div>

            <div className="actions">
              <button className="btn-cancel" onClick={clearAll}>Clear</button>
              <button
                className="btn-upload"
                disabled={!isReady || uploading}
                onClick={handleUpload}
              >
                {uploading ? "Uploading..." : uploadDone ? "Published!" : "Publish Image"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
