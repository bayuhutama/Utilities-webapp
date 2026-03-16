import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { format } from "prettier/standalone";
import * as prettierPluginBabel from "prettier/plugins/babel";
import * as prettierPluginEstree from "prettier/plugins/estree";
import * as prettierPluginHtml from "prettier/plugins/html";
import * as prettierPluginCss from "prettier/plugins/postcss";
import * as prettierPluginTypeScript from "prettier/plugins/typescript";
import { format as formatSQL } from "sql-formatter";
import { Wand2, Minimize2, Copy, Check, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: "json", label: "JSON", monaco: "json", prettier: "json" },
  { value: "javascript", label: "JavaScript", monaco: "javascript", prettier: "babel" },
  { value: "typescript", label: "TypeScript", monaco: "typescript", prettier: "typescript" },
  { value: "html", label: "HTML", monaco: "html", prettier: "html" },
  { value: "css", label: "CSS", monaco: "css", prettier: "css" },
  { value: "xml", label: "XML", monaco: "xml", prettier: null },
  { value: "sql", label: "SQL", monaco: "sql", prettier: "sql" },
];

function beautifyXml(xml) {
  let formatted = "";
  let indent = 0;
  const tab = "  ";
  xml.split(/>\s*</).forEach((node) => {
    if (node.match(/^\/\w/)) indent--;
    formatted += tab.repeat(Math.max(indent, 0)) + "<" + node + ">\n";
    if (node.match(/^<?\w[^/]*[^/]$/) && !node.startsWith("?") && !node.startsWith("!")) indent++;
  });
  return formatted.trim().replace(/^</, "").replace(/>$/, "");
}

function minifyXml(xml) {
  return xml.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
}

export default function TextBeautify() {
  const [language, setLanguage] = useState("json");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const currentLang = LANGUAGES.find((l) => l.value === language);

  const handleBeautify = async () => {
    setError(null);
    try {
      let result = code;
      if (language === "xml") {
        result = beautifyXml(code);
      } else if (language === "sql") {
        result = formatSQL(code, { language: "sql", tabWidth: 2 });
      } else if (currentLang.prettier) {
        const plugins = [];
        if (currentLang.prettier === "json" || currentLang.prettier === "babel") {
          plugins.push(prettierPluginBabel, prettierPluginEstree);
        }
        if (currentLang.prettier === "html") plugins.push(prettierPluginHtml);
        if (currentLang.prettier === "css") plugins.push(prettierPluginCss);
        if (currentLang.prettier === "typescript") {
          plugins.push(prettierPluginTypeScript, prettierPluginEstree);
        }
        result = await format(code, {
          parser: currentLang.prettier,
          plugins,
          printWidth: 80,
          tabWidth: 2,
          semi: true,
          singleQuote: false,
        });
      }
      setCode(result);
    } catch (e) {
      setError(e.message || "Failed to beautify.");
    }
  };

  const handleMinify = () => {
    setError(null);
    try {
      let result = code;
      if (language === "json") {
        result = JSON.stringify(JSON.parse(code));
      } else if (language === "xml") {
        result = minifyXml(code);
      } else if (language === "css") {
        result = code.replace(/\s*([{}:;,])\s*/g, "$1").replace(/\s+/g, " ").trim();
      } else if (language === "html") {
        result = code.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
      } else if (language === "sql") {
        result = code.replace(/\s+/g, " ").trim();
      } else {
        result = code.replace(/\s+/g, " ").trim();
      }
      setCode(result);
    } catch (e) {
      setError(e.message || "Failed to minify.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCode(ev.target.result);
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-6 md:p-8 h-full flex flex-col max-w-6xl mx-auto">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Beautify / Minify</h1>
          <p className="text-muted-foreground">Format or minify code with syntax highlighting.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={language} onValueChange={(v) => { setLanguage(v); setError(null); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleBeautify} disabled={!code.trim()}>
          <Wand2 className="h-4 w-4" />
          Beautify
        </Button>
        <Button variant="outline" onClick={handleMinify} disabled={!code.trim()}>
          <Minimize2 className="h-4 w-4" />
          Minify
        </Button>
        <Button variant="ghost" size="icon" onClick={handleCopy} disabled={!code.trim()} title="Copy">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => { setCode(""); setError(null); }} title="Clear">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
          <Upload className="h-4 w-4" />
          Upload file
          <input type="file" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      {error && (
        <Card className="p-3 mb-3 border-destructive/50 bg-destructive/5">
          <p className="text-sm text-destructive font-mono">{error}</p>
        </Card>
      )}

      <div className="flex-1 rounded-lg border border-border overflow-hidden min-h-[500px]">
        <Editor
          height="100%"
          defaultLanguage="json"
          language={currentLang.monaco}
          value={code}
          onChange={(v) => setCode(v || "")}
          theme={document.documentElement.classList.contains("dark") ? "vs-dark" : "vs"}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            formatOnPaste: false,
          }}
        />
      </div>
    </div>
  );
}
