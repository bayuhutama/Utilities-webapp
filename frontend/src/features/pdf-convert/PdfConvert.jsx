import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileOutput, Upload, Download, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn, formatBytes } from "@/lib/utils";

export default function PdfConvert() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("pdf-to-docx"); // or "docx-to-pdf"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const accept =
    mode === "pdf-to-docx"
      ? { "application/pdf": [".pdf"] }
      : {
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
          "application/msword": [".doc"],
        };

  const onDrop = useCallback(
    (accepted) => {
      if (accepted.length > 0) {
        setFile(accepted[0]);
        setError(null);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
  });

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint =
        mode === "pdf-to-docx"
          ? "/api/convert/pdf-to-docx"
          : "/api/convert/docx-to-pdf";
      const res = await fetch(endpoint, { method: "POST", body: formData });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Conversion failed");
      }
      const blob = await res.blob();
      const ext = mode === "pdf-to-docx" ? "docx" : "pdf";
      const filename = file.name.replace(/\.[^.]+$/, "") + "." + ext;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || "Conversion failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const fromLabel = mode === "pdf-to-docx" ? "PDF" : "DOCX";
  const toLabel = mode === "pdf-to-docx" ? "DOCX" : "PDF";

  return (
    <div className="p-6 md:p-8 max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">PDF Convert</h1>
        <p className="text-muted-foreground">Convert between PDF and DOCX with high fidelity.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => { setMode("pdf-to-docx"); setFile(null); setError(null); }}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            mode === "pdf-to-docx" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          PDF → DOCX
        </button>
        <button
          onClick={() => { setMode("docx-to-pdf"); setFile(null); setError(null); }}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            mode === "docx-to-pdf" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          DOCX → PDF
        </button>
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
          <div>
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-foreground">Drop a {fromLabel} file here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex items-center justify-center gap-3 mb-4 text-sm text-muted-foreground">
          <span className="px-2 py-1 bg-muted rounded font-mono text-xs">{fromLabel}</span>
          <ArrowRight className="h-4 w-4" />
          <span className="px-2 py-1 bg-primary/10 text-primary rounded font-mono text-xs">{toLabel}</span>
        </div>
      )}

      {error && (
        <Card className="p-3 mb-4 border-destructive/50 bg-destructive/5">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <Button className="w-full" size="lg" onClick={handleConvert} disabled={!file || loading}>
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Converting...</>
        ) : (
          <><Download className="h-4 w-4" /> Convert & Download</>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-3">
        Conversion is processed on the local backend. Files are never uploaded to the cloud.
      </p>
    </div>
  );
}
