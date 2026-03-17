import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn, formatBytes } from "@/lib/utils";

const QUALITY_OPTIONS = [
  { label: "Low",    value: 30 },
  { label: "Medium", value: 60 },
  { label: "High",   value: 85 },
];

export default function CompressPdf() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setError(null);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  const handleCompress = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("quality", quality);

      const res = await fetch("/api/pdf/compress", { method: "POST", body: formData });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Compression failed");
      }

      const compressionResult = res.headers.get("X-Compression-Result");
      const originalSize   = parseInt(res.headers.get("X-Original-Size"),   10);
      const compressedSize = parseInt(res.headers.get("X-Compressed-Size"), 10);
      const noGain = compressionResult === "no-reduction";

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = noGain
        ? file.name
        : file.name.replace(/\.pdf$/i, "") + "_compressed.pdf";
      a.click();
      URL.revokeObjectURL(url);

      setResult({ originalSize, compressedSize, noGain });
    } catch (e) {
      setError(e.message || "Compression failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const reduction = result && !result.noGain
    ? (((result.originalSize - result.compressedSize) / result.originalSize) * 100).toFixed(1)
    : null;

  return (
    <div className="p-6 md:p-8 max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Compress PDF</h1>
        <p className="text-muted-foreground">
          Reduce PDF file size by downsampling images and applying structural compression.
        </p>
      </div>

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
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">Drop a PDF file here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
          </>
        )}
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium text-foreground block mb-2">Quality</label>
        <div className="flex gap-2">
          {QUALITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setQuality(opt.value); setResult(null); }}
              className={cn(
                "flex-1 py-2 text-sm rounded-md border transition-colors",
                quality === opt.value
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <Card className={cn(
          "p-3 mb-4",
          result.noGain ? "border-yellow-500/30 bg-yellow-500/5" : "border-green-500/30 bg-green-500/5"
        )}>
          <p className={cn(
            "text-sm font-medium",
            result.noGain ? "text-yellow-700 dark:text-yellow-400" : "text-green-700 dark:text-green-400"
          )}>
            {result.noGain
              ? "File is already optimized. No reduction possible at this quality setting."
              : "Compression complete"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}
            {!result.noGain && (
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
        Processed by the local backend. Files are never uploaded to the cloud.
      </p>
    </div>
  );
}
