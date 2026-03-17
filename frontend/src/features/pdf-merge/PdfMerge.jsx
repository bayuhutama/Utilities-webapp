import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PDFDocument } from "pdf-lib";
import { GripVertical, Trash2, FileText, Download, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn, formatBytes } from "@/lib/utils";

const PDFJS_VERSION = "3.11.174";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = `${PDFJS_CDN}/pdf.min.js`;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.head.appendChild(script);
  });
}

function MergedPreview({ files }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Always clear canvases — ref is always mounted so this is always safe
    containerRef.current.innerHTML = "";

    if (files.length === 0) {
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function mergeAndRender() {
      try {
        // Merge all PDFs in order using pdf-lib
        const merged = await PDFDocument.create();
        for (const item of files) {
          const bytes = await item.file.arrayBuffer();
          if (cancelled) return;
          const doc = await PDFDocument.load(bytes);
          const pages = await merged.copyPages(doc, doc.getPageIndices());
          pages.forEach((page) => merged.addPage(page));
        }
        if (cancelled) return;

        const pdfBytes = await merged.save();
        if (cancelled) return;

        // Render all pages with PDF.js
        const pdfjsLib = await loadPdfJs();
        if (cancelled) return;

        const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        if (cancelled) return;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = "block";
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.borderRadius = "6px";
          canvas.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";

          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;

          if (cancelled) return;
          containerRef.current.appendChild(canvas);
        }
      } catch (e) {
        if (!cancelled) setError("Failed to render merged preview. Make sure all files are valid PDFs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    mergeAndRender();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const isEmpty = files.length === 0;

  return (
    <div className="relative min-h-full">
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground select-none">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-25" />
            <p className="text-sm">Add PDF files to see preview</p>
          </div>
        </div>
      )}
      {!isEmpty && loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/70 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating preview...
          </div>
        </div>
      )}
      {!isEmpty && error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <p className="text-sm text-destructive text-center">{error}</p>
        </div>
      )}
      <div ref={containerRef} className="flex flex-col gap-3 p-3" />
    </div>
  );
}

function SortableFile({ file, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: file.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card transition-shadow",
        isDragging ? "shadow-lg opacity-80 z-10" : "shadow-sm"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="w-8 h-8 rounded bg-violet-500/10 flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-violet-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
      </div>
      <button
        onClick={() => onRemove(file.id)}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function PdfMerge() {
  const [files, setFiles] = useState([]);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name,
      size: f.size,
      file: f,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeFile = (id) => setFiles((f) => f.filter((x) => x.id !== id));

  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Add at least 2 PDF files to merge.");
      return;
    }
    setMerging(true);
    setError(null);
    try {
      const merged = await PDFDocument.create();
      for (const item of files) {
        const bytes = await item.file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }
      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Failed to merge PDFs. Make sure files are valid and not password-protected.");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">PDF Merge</h1>
        <p className="text-muted-foreground">Upload PDFs, drag to reorder, then merge into one file.</p>
      </div>

      <div className="flex gap-4" style={{ height: "80vh" }}>
        {/* Left column — upload + file list + merge */}
        <div className="flex flex-col gap-4 overflow-y-auto shrink-0" style={{ width: "40%" }}>
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors shrink-0",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <input {...getInputProps()} />
            <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Drop PDF files here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
          </div>

          {files.length > 0 && (
            <>
              <div className="flex items-center justify-between shrink-0">
                <span className="text-sm font-medium text-foreground">
                  Files <Badge variant="secondary">{files.length}</Badge>
                </span>
                <button onClick={() => setFiles([])} className="text-xs text-muted-foreground hover:text-destructive">
                  Clear all
                </button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {files.map((file) => (
                      <SortableFile key={file.id} file={file} onRemove={removeFile} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}

          {error && (
            <Card className="p-3 border-destructive/50 bg-destructive/5 shrink-0">
              <p className="text-sm text-destructive">{error}</p>
            </Card>
          )}

          <Button
            className="w-full shrink-0"
            size="lg"
            onClick={handleMerge}
            disabled={files.length < 2 || merging}
          >
            {merging ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Merging...</>
            ) : (
              <><Download className="h-4 w-4" /> Merge & Download</>
            )}
          </Button>
        </div>

        {/* Right column — live merged preview */}
        <div className="flex-1 border rounded-lg overflow-y-auto bg-muted/20">
          <MergedPreview files={files} />
        </div>
      </div>
    </div>
  );
}
