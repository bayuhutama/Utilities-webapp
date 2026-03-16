# UtilKit — Developer Utilities Web App

A local-only utilities app for common developer tasks. Files never leave the machine except for PDF conversion, which is processed by the local backend.

## Project Structure

```
Utilities-webapp/
  frontend/   React 18 + Vite + Tailwind CSS + Radix UI
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
    pdf-convert/       Calls backend API for PDF↔DOCX conversion
    text-diff/         Word-level side-by-side diff (diff package)
    text-beautify/     Monaco editor + prettier + sql-formatter
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

**Stack:** Spring Boot 3.2, Java 17, Maven, JODConverter 4.4.7

**Purpose:** Handles PDF↔DOCX conversion only. Everything else is client-side.

**Requires LibreOffice installed locally.** JODConverter auto-detects it.
If LibreOffice is in a non-default path, set in `application.yml`:
```yaml
jodconverter:
  local:
    office-home: "C:/Program Files/LibreOffice"
```

**Endpoints:**
- `POST /api/convert/pdf-to-docx` — multipart `file` (PDF) → returns DOCX bytes
- `POST /api/convert/docx-to-pdf` — multipart `file` (DOCX/DOC) → returns PDF bytes

**Source layout:**
```
src/main/java/com/utilkit/backend/
  BackendApplication.java
  config/CorsConfig.java          CORS for localhost:5173
  controller/ConvertController.java
  service/ConversionService.java
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

- **Client-side by default** — PDF merge, text diff, and beautify never send data to any server.
- **Backend only for conversion** — LibreOffice via JODConverter is the only way to achieve high-fidelity PDF↔DOCX conversion.
- **No auth, no persistence** — fully stateless, local dev tool only.
- **Dark mode** — toggled via `document.documentElement.classList.toggle("dark")`, persists per session only.
