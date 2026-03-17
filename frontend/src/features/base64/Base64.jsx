import { useState, useRef } from "react";
import { Copy, Check, Trash2, Upload, Download, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// ─── Detection helpers ────────────────────────────────────────────────────────

// Known image magic bytes encoded as base64 prefixes
const IMAGE_B64_PREFIXES = [
  { prefix: "iVBORw",  mime: "image/png"  },
  { prefix: "/9j/",   mime: "image/jpeg" },
  { prefix: "R0lGOD", mime: "image/gif"  },
  { prefix: "UklGR",  mime: "image/webp" },
  { prefix: "Qk",     mime: "image/bmp"  },
];

const B64_RE = /^[A-Za-z0-9+/\r\n]+=*$/;

function isValidBase64(str) {
  const s = str.replace(/\s/g, "");
  return s.length > 0 && s.length % 4 === 0 && B64_RE.test(s);
}

// Returns { type: "image-decode", src, mime }
//       | { type: "text-decode", text }
//       | { type: "text-encode", b64 }
//       | null (empty)
function detect(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Full data URL
  if (trimmed.startsWith("data:image/")) {
    return { type: "image-decode", src: trimmed, mime: trimmed.split(";")[0].slice(5) };
  }
  if (trimmed.startsWith("data:")) {
    // Non-image data URL — try to decode the base64 part as text
    const raw = trimmed.split(",")[1] ?? "";
    if (raw) {
      try { return { type: "text-decode", text: decodeURIComponent(escape(atob(raw))) }; } catch { /* fall through */ }
    }
  }

  // 2. Raw base64
  if (isValidBase64(trimmed)) {
    const raw = trimmed.replace(/\s/g, "");

    // Check image magic bytes
    const imgMatch = IMAGE_B64_PREFIXES.find(({ prefix }) => raw.startsWith(prefix));
    if (imgMatch) {
      return { type: "image-decode", src: `data:${imgMatch.mime};base64,${raw}`, mime: imgMatch.mime };
    }

    // Try decoding as text
    try {
      const text = decodeURIComponent(escape(atob(raw)));
      return { type: "text-decode", text };
    } catch { /* fall through */ }
  }

  // 3. Plain text — encode it
  try {
    const b64 = btoa(unescape(encodeURIComponent(trimmed)));
    return { type: "text-encode", b64 };
  } catch {
    return null;
  }
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button variant={label ? "outline" : "ghost"} size="sm" className="h-7 gap-1 text-xs" onClick={copy} disabled={!text}>
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : (label ?? "Copy")}
    </Button>
  );
}

function Badge({ mode }) {
  const isEncode = mode === "encode";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
      isEncode
        ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
        : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
    )}>
      {isEncode ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
      {isEncode ? "Encoding" : "Decoding"}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Base64() {
  const [input, setInput]       = useState("");
  const [uploadedFile, setUploadedFile] = useState(null); // { name, src, mime, b64 }
  const [result, setResult]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileRef = useRef(null);

  const process = (value) => {
    setImgError(false);
    setResult(detect(value));
  };

  const handleTextChange = (e) => {
    setUploadedFile(null); // clear any uploaded file when user types
    setInput(e.target.value);
    process(e.target.value);
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const raw = dataUrl.split(",")[1];
      setInput(""); // keep textarea empty — base64 goes to output only
      setImgError(false);
      const fileData = { name: file.name, src: dataUrl, mime: file.type, b64: raw };
      setUploadedFile(fileData);
      setResult({ type: "image-encode", src: dataUrl, mime: file.type, name: file.name, b64: raw });
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
    else {
      const reader = new FileReader();
      reader.onload = (ev) => { setUploadedFile(null); setInput(ev.target.result); process(ev.target.result); };
      reader.readAsText(file);
    }
  };

  const clear = () => { setInput(""); setUploadedFile(null); setResult(null); setImgError(false); };

  const downloadImage = (src) => {
    const a = document.createElement("a");
    a.href = src; a.download = "decoded-image"; a.click();
  };

  const detectedMode = result
    ? (result.type === "text-encode" || result.type === "image-encode" ? "encode" : "decode")
    : null;

  const hasInput = input || uploadedFile;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Base64</h1>
        <p className="text-muted-foreground">
          Paste text, Base64, a data URL, or drop an image — type detected automatically.
        </p>
      </div>

      {/* Input */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="mb-4"
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Input</label>
            {detectedMode && <Badge mode={detectedMode} />}
          </div>
          <div className="flex items-center gap-1">
            <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <Upload className="h-3 w-3" /> Upload image
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => handleFile(e.target.files[0])} />
            </label>
            {!uploadedFile && (
              <>
                <span className="text-border mx-1">|</span>
                <CopyButton text={input} />
              </>
            )}
          </div>
        </div>

        {uploadedFile ? (
          /* File chip — shown instead of textarea when an image is uploaded */
          <div className={cn(
            "w-full rounded-lg border-2 bg-card p-4 flex items-center gap-3 transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border"
          )}>
            <div className="w-12 h-12 rounded-md overflow-hidden border border-border shrink-0 bg-muted">
              <img src={uploadedFile.src} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">{uploadedFile.mime}</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 shrink-0" onClick={clear}>
              <Trash2 className="h-3 w-3" /> Remove
            </Button>
          </div>
        ) : (
          <textarea
            value={input}
            onChange={handleTextChange}
            placeholder="Paste plain text, Base64, or a data URL — or drop / upload an image…"
            className={cn(
              "w-full h-44 p-3 rounded-lg border-2 bg-card text-foreground text-sm font-mono resize-y outline-none transition-colors focus:border-primary",
              dragging ? "border-primary bg-primary/5" : "border-border"
            )}
          />
        )}
      </div>

      {hasInput && !uploadedFile && (
        <div className="flex justify-end mb-5">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={clear}>
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      )}

      {/* Output */}
      {result?.type === "text-encode" && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">Base64 Output</label>
            <CopyButton text={result.b64} />
          </div>
          <textarea readOnly value={result.b64}
            className="w-full h-44 p-3 rounded-lg border border-border bg-muted text-foreground text-sm font-mono resize-y outline-none cursor-default" />
        </div>
      )}

      {result?.type === "text-decode" && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">Decoded Text</label>
            <CopyButton text={result.text} />
          </div>
          <textarea readOnly value={result.text}
            className="w-full h-44 p-3 rounded-lg border border-border bg-muted text-foreground text-sm font-mono resize-y outline-none cursor-default" />
        </div>
      )}

      {result?.type === "image-encode" && (
        <div>
          <div className="rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center mb-4" style={{ minHeight: 160 }}>
            <img src={result.src} alt="preview" className="max-h-64 max-w-full object-contain p-2" />
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">Base64 Output</label>
            <div className="flex gap-1">
              <CopyButton text={result.b64} label="Copy raw" />
              <CopyButton text={result.src} label="Copy data URL" />
            </div>
          </div>
          <textarea readOnly value={result.b64}
            className="w-full h-28 p-3 rounded-lg border border-border bg-muted text-foreground text-xs font-mono resize-y outline-none cursor-default" />
        </div>
      )}

      {result?.type === "image-decode" && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">Image Preview</label>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => downloadImage(result.src)}>
              <Download className="h-3 w-3" /> Download
            </Button>
          </div>
          {imgError ? (
            <div className="w-full p-4 rounded-lg border border-destructive/50 bg-destructive/5 text-destructive text-sm">
              Invalid Base64 or unsupported image format.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center" style={{ minHeight: 200 }}>
              <img src={result.src} alt="decoded" onError={() => setImgError(true)}
                className="max-h-80 max-w-full object-contain p-2" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
