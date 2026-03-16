import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  FilePlus2, FileOutput, AlignLeft, Code2, Moon, Sun, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/pdf-merge", icon: FilePlus2, label: "PDF Merge", desc: "Combine PDFs" },
  { to: "/pdf-convert", icon: FileOutput, label: "PDF Convert", desc: "PDF ↔ DOCX" },
  { to: "/text-diff", icon: AlignLeft, label: "Text Diff", desc: "Compare text" },
  { to: "/text-beautify", icon: Code2, label: "Beautify", desc: "Format & minify" },
];

export default function Layout() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark((d) => !d);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-30 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-200",
          "lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border">
          <span className="font-bold text-lg text-foreground">
            <span className="text-primary">Util</span>Kit
          </span>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, desc }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-4 w-4 shrink-0" />
                  <div>
                    <div className={cn("font-medium", isActive ? "text-primary-foreground" : "text-foreground")}>{label}</div>
                    <div className={cn("text-xs", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>{desc}</div>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={toggleDark}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? "Light mode" : "Dark mode"}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-card lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-foreground">
            <span className="text-primary">Util</span>Kit
          </span>
          <div className="ml-auto">
            <Button variant="ghost" size="icon" onClick={toggleDark}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
