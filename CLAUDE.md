# UtilKit — Developer Utilities Web App

A local-only utilities app for common developer tasks. Files never leave the machine except for PDF compression, which is processed by the local backend. Everything else runs entirely client-side.

## Project Structure

```
Utilities-webapp/
  frontend/   React 19 + Vite + Tailwind CSS + Radix UI
  backend/    Spring Boot 3.2 + Java 17
```

Two separate apps — run them independently.

## Frontend (`frontend/`)

**Stack:** React 19, Vite 8, Tailwind CSS 3, Radix UI primitives, React Router v7

**Source layout:**
```
src/
  components/ui/       Button, Card, Badge, Select (built on Radix UI)
  components/layout/   Layout.jsx — sidebar + dark mode toggle
  features/
    pdf-merge/         Client-side PDF merging (pdf-lib + @dnd-kit)
    compress-pdf/      Calls backend API to compress PDF (re-encodes pages as JPEG)
    compress-image/    Client-side image compression
    text-diff/         Word-level side-by-side diff (diff package)
    text-beautify/     Monaco editor + prettier + sql-formatter
    base64/            Auto-detecting Base64 encode/decode for text and images
  pages/               Home.jsx
  lib/utils.js         cn() and formatBytes() helpers
```

**Path alias:** `@` maps to `src/`

**API proxy:** Vite proxies `/api/*` → `http://localhost:8080` (backend)

**Commands:**
```bash
cd frontend
npm install        # first time
npm run dev        # dev server → http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build
```

## Backend (`backend/`)

**Stack:** Spring Boot 3.2, Java 17, Maven, PDFBox 3.0

**Purpose:** Handles PDF compression only. Everything else is client-side.

**Endpoints:**
- `POST /api/pdf/compress` — multipart `file` (PDF) + optional `quality` (int, default 65) → returns compressed PDF bytes

**Source layout:**
```
src/main/java/com/utilkit/backend/
  BackendApplication.java
  config/CorsConfig.java               CORS for localhost:5173
  controller/PdfController.java        PDF compression
  service/PdfCompressionService.java
```

**Commands (PowerShell on Windows):**
```powershell
cd backend
# Set JAVA_HOME if not set globally
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17.0.17"

.\mvnw.ps1 spring-boot:run     # → http://localhost:8080 (downloads Maven on first run)
.\mvnw.ps1 clean package       # build JAR → target/
.\mvnw.ps1 test
```

## Key Design Decisions

- **Client-side by default** — PDF merge, image compression, text diff, beautify, and Base64 never send data to any server.
- **Backend only for PDF compression** — `PdfCompressionService` re-encodes PDF pages as compressed JPEG images via PDFBox.
- **No auth, no persistence** — fully stateless, local dev tool only.
- **Dark mode** — toggled via `document.documentElement.classList.toggle("dark")`, persists per session only.
