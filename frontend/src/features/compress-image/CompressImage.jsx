import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Download, Loader2, Link } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn, formatBytes } from "@/lib/utils";

const FORMATS = [
  { value: "image/jpeg", label: "JPEG", ext: "jpg" },
  { value: "image/webp", label: "WebP", ext: "webp" },
  { value: "image/png",  label: "PNG",  ext: "png"  },
];

const QUALITY_OPTIONS = [
  { label: "Low",    value: 30  },
  { label: "Medium", value: 60  },
  { label: "High",   value: 85  },
];

export default function CompressImage() {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [quality, setQuality] = useState(60);
  const [format, setFormat]   = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [result, setResult]   = useState(null);

  // Resolution state
  const [origW, setOrigW]   = useState(null);
  const [origH, setOrigH]   = useState(null);
  const [width, setWidth]   = useState("");
  const [height, setHeight] = useState("");
  const aspectRef = useRef(null); // origW / origH

  const onDrop = useCallback((accepted) => {
    if (accepted.length === 0) return;
    const f = accepted[0];
    setFile(f);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      setPreview(src);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setOrigW(w);
        setOrigH(h);
        setWidth(String(w));
        setHeight(String(h));
        aspectRef.current = w / h;
      };
      img.src = src;
    };
    reader.readAsDataURL(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png":  [".png"],
      "image/webp": [".webp"],
    },
    multiple: false,
  });

  const handleWidthChange = (val) => {
    setWidth(val);
    setResult(null);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0 && aspectRef.current) {
      setHeight(String(Math.round(n / aspectRef.current)));
    }
  };

  const handleHeightChange = (val) => {
    setHeight(val);
    setResult(null);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0 && aspectRef.current) {
      setWidth(String(Math.round(n * aspectRef.current)));
    }
  };

  const handleCompress = async () => {
    if (!file || !preview) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = preview;
      });

      const newWidth  = Math.max(1, parseInt(width,  10) || img.naturalWidth);
      const newHeight = Math.max(1, parseInt(height, 10) || img.naturalHeight);

      const canvas = document.createElement("canvas");
      canvas.width  = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext("2d");
      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, newWidth, newHeight);
      }
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const isPng = format === "image/png";
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, format, isPng ? undefined : quality / 100)
      );

      const selectedFormat = FORMATS.find((f) => f.value === format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(/\.[^.]+$/, "") + "_compressed." + selectedFormat.ext;
      a.click();
      URL.revokeObjectURL(url);

      setResult({ originalSize: file.size, compressedSize: blob.size });
    } catch (e) {
      setError("Compression failed: " + (e.message || "Could not process the image."));
    } finally {
      setLoading(false);
    }
  };

  const isPng      = format === "image/png";
  const reduction  = result ? ((1 - result.compressedSize / result.originalSize) * 100).toFixed(1) : null;
  const isLarger   = result && result.compressedSize >= result.originalSize;

  return (
    <div className="p-6 md:p-8 max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Compress Image</h1>
        <p className="text-muted-foreground">
          Reduce image file size by adjusting quality, dimensions, and format.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors mb-4",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        {file ? (
          <>
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)}{origW && ` · ${origW} × ${origH} px`}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">Drop an image here</p>
            <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP supported</p>
          </>
        )}
      </div>

      {preview && (
        <div className="mb-4 rounded-lg overflow-hidden border border-border bg-muted/30">
          <img src={preview} alt="Preview" className="w-full max-h-48 object-contain" />
        </div>
      )}

      <div className="space-y-4 mb-4">
        {/* Format */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Output Format</label>
          <div className="flex gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setFormat(f.value); setResult(null); }}
                className={cn(
                  "flex-1 py-1.5 text-xs rounded-md border transition-colors",
                  format === f.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quality */}
        <div>
          <label className={cn(
            "text-sm font-medium block mb-2",
            isPng ? "text-muted-foreground" : "text-foreground"
          )}>
            Quality
            {isPng && <span className="text-xs font-normal ml-1">(not applicable for PNG)</span>}
          </label>
          <div className="flex gap-2">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={isPng}
                onClick={() => { setQuality(opt.value); setResult(null); }}
                className={cn(
                  "flex-1 py-2 text-sm rounded-md border transition-colors",
                  isPng
                    ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
                    : quality === opt.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            Resolution <span className="text-xs font-normal text-muted-foreground">(aspect ratio locked)</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Width (px)</label>
              <input
                type="number"
                min={1}
                value={width}
                disabled={!file}
                onChange={(e) => handleWidthChange(e.target.value)}
                className={cn(
                  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
                  "focus:outline-none focus:ring-1 focus:ring-primary",
                  !file && "opacity-40 cursor-not-allowed"
                )}
                placeholder="—"
              />
            </div>
            <Link className="h-4 w-4 text-muted-foreground mt-5 shrink-0" />
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Height (px)</label>
              <input
                type="number"
                min={1}
                value={height}
                disabled={!file}
                onChange={(e) => handleHeightChange(e.target.value)}
                className={cn(
                  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
                  "focus:outline-none focus:ring-1 focus:ring-primary",
                  !file && "opacity-40 cursor-not-allowed"
                )}
                placeholder="—"
              />
            </div>
          </div>
          {origW && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Original: {origW} × {origH} px
            </p>
          )}
        </div>
      </div>

      {result && (
        <Card className={cn(
          "p-3 mb-4",
          isLarger ? "border-yellow-500/30 bg-yellow-500/5" : "border-green-500/30 bg-green-500/5"
        )}>
          <p className={cn(
            "text-sm font-medium",
            isLarger ? "text-yellow-700 dark:text-yellow-400" : "text-green-700 dark:text-green-400"
          )}>
            {isLarger ? "Output is larger than original" : "Compression complete"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}
            {!isLarger && (
              <span className="font-medium text-green-600 dark:text-green-400">
                {" "}({reduction}% smaller)
              </span>
            )}
          </p>
        </Card>
      )}

      {error && (
        <Card className="p-3 mb-4 border-destructive/50 bg-destructive/5">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <Button className="w-full" size="lg" onClick={handleCompress} disabled={!file || loading}>
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Compressing...</>
        ) : (
          <><Download className="h-4 w-4" /> Compress & Download</>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-3">
        All processing happens in your browser. Images are never uploaded.
      </p>
    </div>
  );
}
