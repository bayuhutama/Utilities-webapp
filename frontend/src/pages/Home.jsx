import { Link } from "react-router-dom";
import { FilePlus2, FileDown, ImageDown, AlignLeft, Code2, Lock, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

const tools = [
  {
    to: "/pdf-merge",
    icon: FilePlus2,
    title: "PDF Merge",
    description: "Combine multiple PDF files into one. Drag to reorder before merging.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    to: "/compress-pdf",
    icon: FileDown,
    title: "Compress PDF",
    description: "Reduce PDF file size by re-encoding pages as compressed JPEG images.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    to: "/compress-image",
    icon: ImageDown,
    title: "Compress Image",
    description: "Reduce image file size by adjusting quality, dimensions, and format.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    to: "/text-diff",
    icon: AlignLeft,
    title: "Text Diff",
    description: "Compare two texts side-by-side with word-level highlighting.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    to: "/text-beautify",
    icon: Code2,
    title: "Beautify / Minify",
    description: "Format or minify JSON, XML, HTML, CSS, JS, SQL, TypeScript.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    to: "/base64",
    icon: Lock,
    title: "Base64",
    description: "Encode plain text to Base64 or decode Base64 back to text.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
];

export default function Home() {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to UtilKit</h1>
        <p className="text-muted-foreground text-lg">All your developer utilities in one place.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map(({ to, icon: Icon, title, description, color, bg }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full hover:shadow-md transition-shadow hover:border-primary/50">
              <CardHeader>
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="flex items-center justify-between">
                  <CardTitle>{title}</CardTitle>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
