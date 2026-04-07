# UtilKit — Developer Utilities Web App

A local-only utilities app for common developer tasks. Files never leave the machine except for PDF compression, which is processed by the local backend. Everything else runs entirely client-side.

## Project Structure

```
Utilities-webapp/
  frontend/   React 19 + Vite 8 + Tailwind CSS 3 + Radix UI   → http://localhost:5173
  backend/    Spring Boot 3.2 + Java 17 + PDFBox 3.0           → http://localhost:8080
```

Two separate apps — run them independently. Only the backend is needed for PDF Compress; all other tools are purely client-side.

## Frontend (`frontend/`)

**Stack:** React 19, Vite 8, Tailwind CSS 3, Radix UI primitives, React Router v7

**Node requirement:** >= 24.14.0

**Source layout:**
```
src/
  components/ui/       Button, Card, Badge, Select (built on Radix UI)
  components/layout/   Layout.jsx — sidebar + dark mode toggle
  features/
    pdf-merge/         Client-side PDF merging (pdf-lib + @dnd-kit drag-and-drop)
    compress-pdf/      Calls backend API to compress PDF (re-encodes pages as JPEG)
    compress-image/    Client-side image compression (Canvas API)
    text-diff/         Word-level side-by-side diff (diff + diff2html)
    text-beautify/     Monaco editor + prettier + sql-formatter
    base64/            Auto-detecting Base64 encode/decode for text and images
  pages/               Home.jsx — landing page with tool cards
  lib/utils.js         cn() and formatBytes() helpers
```

**Path alias:** `@` maps to `src/`

**API proxy:** Vite proxies `/api/*` → `http://localhost:8080` (backend). Configured in `vite.config.js`.

**Routes (React Router v7):**
- `/` — Home
- `/pdf-merge` — PDF Merge
- `/compress-pdf` — PDF Compress
- `/compress-image` — Image Compress
- `/text-diff` — Text Diff
- `/text-beautify` — Text Beautify
- `/base64` — Base64

**Commands:**
```bash
cd frontend
npm install        # first time or after package changes
npm run dev        # dev server → http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build
npm run lint       # ESLint
```

## Backend (`backend/`)

**Stack:** Spring Boot 3.2, Java 17, Maven (bundled wrapper at `backend/.mvn/`), PDFBox 3.0

**Purpose:** Handles PDF compression only. PDFBox re-renders PDF pages as compressed JPEG images. Everything else is client-side.

**Endpoints:**
- `POST /api/pdf/compress` — multipart `file` (PDF) + optional `quality` (int 1–100, default 65) → returns compressed PDF bytes as `application/octet-stream`

**Source layout:**
```
src/main/java/com/utilkit/backend/
  BackendApplication.java
  config/CorsConfig.java               CORS — allows localhost:5173
  controller/PdfController.java        POST /api/pdf/compress
  service/PdfCompressionService.java   PDFBox compression logic
```

**Commands (PowerShell on Windows):**
```powershell
cd backend
# Set JAVA_HOME if not set globally — must point to JDK 17, not JRE
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17.0.17"

.\mvnw.ps1 spring-boot:run     # → http://localhost:8080 (downloads Maven 3.9.6 on first run)
.\mvnw.ps1 clean package       # build JAR → target/backend-0.0.1-SNAPSHOT.jar
.\mvnw.ps1 test
```

**Commands (macOS / Linux):**
```bash
cd backend
./mvnw spring-boot:run
./mvnw clean package
./mvnw test
```

## Key Design Decisions

- **Client-side by default** — PDF merge, image compression, text diff, beautify, and Base64 never send data to any server.
- **Backend only for PDF compression** — `PdfCompressionService` re-encodes PDF pages as compressed JPEG images via PDFBox. Canvas API cannot reliably do this in the browser.
- **No auth, no persistence** — fully stateless, local dev tool only. No database, no sessions.
- **Dark mode** — toggled via `document.documentElement.classList.toggle("dark")`, persists per browser session only.
- **Vite proxy** — frontend always uses `/api/*` relative URLs; Vite forwards them to `localhost:8080` in dev. No hardcoded backend URLs in frontend code.

## CORS

`CorsConfig.java` allows requests only from `http://localhost:5173`. If you change the frontend port, update this config accordingly.
