import { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import * as Diff from "diff";
import { Upload, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: "plaintext", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "xml", label: "XML" },
  { value: "sql", label: "SQL" },
];

// ─── Diff engine ─────────────────────────────────────────────────────────────

function splitLines(str) {
  const lines = str.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.length > 0 ? lines : [""];
}

function buildAlignedDiff(left, right) {
  const diffs = Diff.diffLines(left, right);
  const leftLines = [];
  const rightLines = [];

  for (let i = 0; i < diffs.length; i++) {
    const part = diffs[i];
    const lines = splitLines(part.value);

    if (!part.added && !part.removed) {
      lines.forEach((line) => {
        leftLines.push({ text: line, type: "normal", inlineParts: null });
        rightLines.push({ text: line, type: "normal", inlineParts: null });
      });
    } else if (part.removed) {
      const next = diffs[i + 1];
      if (next && next.added) {
        const addedLines = splitLines(next.value);
        const maxLen = Math.max(lines.length, addedLines.length);
        for (let j = 0; j < maxLen; j++) {
          const hasL = j < lines.length;
          const hasR = j < addedLines.length;
          if (hasL && hasR) {
            const wdiff = Diff.diffWords(lines[j], addedLines[j]);
            const lp = wdiff.filter((d) => !d.added).map((d) => ({ text: d.value, changed: !!d.removed }));
            const rp = wdiff.filter((d) => !d.removed).map((d) => ({ text: d.value, changed: !!d.added }));
            leftLines.push({ text: lines[j],      type: "removed", inlineParts: lp });
            rightLines.push({ text: addedLines[j], type: "added",   inlineParts: rp });
          } else if (hasL) {
            leftLines.push({ text: lines[j], type: "removed", inlineParts: null });
            rightLines.push({ text: "",      type: "empty",   inlineParts: null });
          } else {
            leftLines.push({ text: "",           type: "empty", inlineParts: null });
            rightLines.push({ text: addedLines[j], type: "added", inlineParts: null });
          }
        }
        i++;
      } else {
        lines.forEach((line) => {
          leftLines.push({ text: line, type: "removed", inlineParts: null });
          rightLines.push({ text: "",   type: "empty",   inlineParts: null });
        });
      }
    } else {
      lines.forEach((line) => {
        leftLines.push({ text: "",   type: "empty", inlineParts: null });
        rightLines.push({ text: line, type: "added", inlineParts: null });
      });
    }
  }

  let ln = 0;
  leftLines.forEach((l)  => { l.lineNum = l.type !== "empty" ? ++ln : null; });
  ln = 0;
  rightLines.forEach((l) => { l.lineNum = l.type !== "empty" ? ++ln : null; });

  const changedLeft  = new Set(leftLines.map((l, i)  => l.type === "removed" ? i : -1).filter((i) => i >= 0));
  const changedRight = new Set(rightLines.map((l, i) => l.type === "added"   ? i : -1).filter((i) => i >= 0));

  return { leftLines, rightLines, changedLeft, changedRight };
}

// ─── Line rendering ───────────────────────────────────────────────────────────

const ROW_BG = {
  normal:  "",
  removed: "bg-red-50   dark:bg-red-950/40",
  added:   "bg-green-50 dark:bg-green-950/40",
  empty:   "",
};
const INDICATOR = {
  normal:  "bg-transparent",
  removed: "bg-red-500",
  added:   "bg-green-500",
  empty:   "bg-transparent",
};
const WORD_MARK = {
  removed: "bg-red-200   dark:bg-red-800/70 rounded-sm",
  added:   "bg-green-200 dark:bg-green-800/70 rounded-sm",
};
const EMPTY_STRIPE = {
  backgroundImage:
    "repeating-linear-gradient(135deg,transparent,transparent 3px,rgba(120,120,120,.07) 3px,rgba(120,120,120,.07) 5px)",
};

function LineContent({ line }) {
  if (line.type === "empty") return <div className="h-[1.375rem]" style={EMPTY_STRIPE} />;
  if (!line.inlineParts)    return <>{line.text}</>;
  return (
    <>
      {line.inlineParts.map((p, i) =>
        p.changed
          ? <mark key={i} className={WORD_MARK[line.type]}>{p.text}</mark>
          : <span key={i}>{p.text}</span>
      )}
    </>
  );
}

// Each row lives inside a CSS grid row — no overflow clipping here
function LineRow({ line }) {
  return (
    <div className={cn("flex items-stretch min-h-[1.375rem]", ROW_BG[line.type])}>
      {/* 3-px change indicator */}
      <div className={cn("w-[3px] shrink-0", INDICATOR[line.type])} />
      {/* Line number gutter */}
      <div className="w-[3.5rem] text-right text-[11px] leading-[1.375rem] select-none pr-2 text-muted-foreground border-r border-border/40 shrink-0 font-mono">
        {line.lineNum ?? ""}
      </div>
      {/* Content — whitespace-pre lets long lines expand the cell */}
      <div className="px-3 text-[12px] leading-[1.375rem] font-mono whitespace-pre">
        <LineContent line={line} />
      </div>
    </div>
  );
}

// ─── Overview ruler ───────────────────────────────────────────────────────────

function OverviewRuler({ scrollRef, syncRef, changedLeft, changedRight, totalLines }) {
  const rulerRef = useRef(null);
  const [thumb, setThumb] = useState({ top: 0, height: 100 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight) { setThumb({ top: 0, height: 100 }); return; }
      setThumb({ top: (scrollTop / scrollHeight) * 100, height: (clientHeight / scrollHeight) * 100 });
    };
    update();
    el.addEventListener("scroll", update);
    return () => el.removeEventListener("scroll", update);
  }, [scrollRef, totalLines]);

  const handleClick = (e) => {
    const el = scrollRef.current;
    const ruler = rulerRef.current;
    if (!el || !ruler) return;
    const rect = ruler.getBoundingClientRect();
    const newScrollTop = ((e.clientY - rect.top) / rect.height) * el.scrollHeight;
    el.scrollTop = newScrollTop;
    if (syncRef?.current) syncRef.current.scrollTop = newScrollTop;
  };

  const lh = totalLines > 0 ? 100 / totalLines : 0;

  return (
    <div
      ref={rulerRef}
      onClick={handleClick}
      title="Click to jump"
      className="w-4 shrink-0 bg-muted border-l border-border relative cursor-pointer overflow-hidden"
    >
      {[...changedLeft].map((idx) => (
        <div key={`l${idx}`} style={{ top: `${idx * lh}%`, height: `${Math.max(lh, 0.8)}%` }}
          className="absolute left-0 right-0 bg-red-400 dark:bg-red-500 opacity-75" />
      ))}
      {[...changedRight].map((idx) => (
        <div key={`r${idx}`} style={{ top: `${idx * lh}%`, height: `${Math.max(lh, 0.8)}%` }}
          className="absolute left-0 right-0 bg-green-400 dark:bg-green-500 opacity-75" />
      ))}
      <div
        style={{ top: `${thumb.top}%`, height: `${thumb.height}%` }}
        className="absolute left-0 right-0 bg-foreground/10 border-y border-foreground/20 pointer-events-none"
      />
    </div>
  );
}

// ─── Input panel ─────────────────────────────────────────────────────────────

function DiffPanel({ label, text, onChange, onFileDrop }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: ([file]) => { if (file) { const r = new FileReader(); r.onload = (e) => onFileDrop(e.target.result); r.readAsText(file); } },
    noClick: true, noKeyboard: true,
  });
  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
          <Upload className="h-3 w-3" /> Upload file
          <input type="file" className="hidden" onChange={(e) => {
            const f = e.target.files[0];
            if (f) { const r = new FileReader(); r.onload = (ev) => onFileDrop(ev.target.result); r.readAsText(f); }
          }} />
        </label>
      </div>
      <div {...getRootProps()} className="flex-1">
        <input {...getInputProps()} />
        <textarea value={text} onChange={(e) => onChange(e.target.value)}
          placeholder="Paste or drop text here..."
          className={cn(
            "w-full h-56 p-3 rounded-lg border bg-card text-foreground text-sm font-mono resize-y outline-none transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-border focus:border-primary"
          )}
        />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TextDiff() {
  const [left, setLeft]         = useState("");
  const [right, setRight]       = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [diffResult, setDiffResult] = useState(null);
  const leftColRef  = useRef(null);
  const rightColRef = useRef(null);
  const isSyncing   = useRef(false);

  const syncScroll = (source, target) => () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (target.current) target.current.scrollTop = source.current.scrollTop;
    isSyncing.current = false;
  };

  const handleCompare = () => setDiffResult(buildAlignedDiff(left, right));
  const hasDiff = left.trim() || right.trim();

  const totalLines = diffResult
    ? Math.max(diffResult.leftLines.length, diffResult.rightLines.length)
    : 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Text Diff</h1>
          <p className="text-muted-foreground">Compare two texts side-by-side with word-level highlighting.</p>
        </div>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <DiffPanel label="Original" text={left} onChange={setLeft} onFileDrop={setLeft} />
        <DiffPanel label="Modified" text={right} onChange={setRight} onFileDrop={setRight} />
      </div>

      <div className="flex gap-2 mb-6">
        <Button onClick={handleCompare} disabled={!hasDiff}>
          <AlignLeft className="h-4 w-4" /> Compare
        </Button>
        <Button variant="outline" onClick={() => { setLeft(""); setRight(""); setDiffResult(null); }}>
          Clear
        </Button>
      </div>

      {diffResult && (
        <div className="rounded-lg border border-border overflow-hidden shadow-sm">

          {/* Column headers — fixed, outside the scroll area */}
          <div className="grid grid-cols-2 bg-muted border-b border-border text-xs font-medium">
            <div className="flex items-center gap-2 px-3 py-2 border-r border-border">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400 shrink-0" />
              <span className="text-foreground">Original</span>
              <span className="ml-auto text-muted-foreground tabular-nums">
                {diffResult.changedLeft.size} removed
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-400 shrink-0" />
              <span className="text-foreground">Modified</span>
              <span className="ml-auto text-muted-foreground tabular-nums">
                {diffResult.changedRight.size} added
              </span>
            </div>
          </div>

          {/* Diff rows + overview ruler */}
          <div className="flex">

            {/* Each column has a fixed height and its own scroll — horizontal scrollbar
                always visible at the bottom of the visible box, vertical sync'd via events */}
            <div className="flex-1 grid min-w-0" style={{ gridTemplateColumns: "1fr 1px 1fr" }}>
              <div
                ref={leftColRef}
                className="min-w-0 bg-card"
                style={{ height: "560px", overflowX: "scroll", overflowY: "auto" }}
                onScroll={syncScroll(leftColRef, rightColRef)}
              >
                {diffResult.leftLines.map((line, i) => <LineRow key={i} line={line} />)}
              </div>
              <div className="bg-border" />
              <div
                ref={rightColRef}
                className="min-w-0 bg-card"
                style={{ height: "560px", overflowX: "scroll", overflowY: "auto" }}
                onScroll={syncScroll(rightColRef, leftColRef)}
              >
                {diffResult.rightLines.map((line, i) => <LineRow key={i} line={line} />)}
              </div>
            </div>

            {/* Overview ruler — tracks left column's vertical scroll */}
            <OverviewRuler
              scrollRef={leftColRef}
              syncRef={rightColRef}
              changedLeft={diffResult.changedLeft}
              changedRight={diffResult.changedRight}
              totalLines={totalLines}
            />
          </div>

          {/* Footer stats */}
          <div className="flex items-center gap-4 px-3 py-1.5 bg-muted border-t border-border text-[11px] text-muted-foreground">
            <span className="text-red-600 dark:text-red-400">− {diffResult.changedLeft.size} removed</span>
            <span className="text-green-600 dark:text-green-400">+ {diffResult.changedRight.size} added</span>
            <span className="ml-auto">{totalLines} lines total</span>
          </div>
        </div>
      )}
    </div>
  );
}
