# UtilKit — Developer Utilities Web App

A local-only utilities app for common developer tasks. All processing happens client-side in the browser — files never leave your machine, except for PDF compression which is handled by the local Spring Boot backend.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Frontend](#frontend)
  - [Source layout](#source-layout)
  - [Path alias](#path-alias)
  - [API proxy](#api-proxy)
  - [Commands](#commands)
  - [Key dependencies](#key-dependencies)
- [Backend](#backend)
  - [API endpoints](#api-endpoints)
  - [Source layout](#source-layout-1)
  - [Commands](#commands-1)
  - [Running the built JAR](#running-the-built-jar)
- [Design Decisions](#design-decisions)
- [Troubleshooting](#troubleshooting)

---

## Features

| Tool | Route | Processing |
|------|-------|------------|
| PDF Merge | `/pdf-merge` | Client-side (pdf-lib + drag-and-drop reorder) |
| PDF Compress | `/compress-pdf` | Backend (PDFBox re-encodes pages as JPEG) |
| Image Compress | `/compress-image` | Client-side (Canvas API) |
| Text Diff | `/text-diff` | Client-side (word-level side-by-side diff) |
| Text Beautify | `/text-beautify` | Client-side (Monaco editor + Prettier + sql-formatter) |
| Base64 | `/base64` | Client-side (auto-detect encode/decode for text & images) |

## Architecture

```
Utilities-webapp/
  frontend/   React 19 + Vite + Tailwind CSS + Radix UI   → http://localhost:5173
  backend/    Spring Boot 3.2 + Java 17 + PDFBox           → http://localhost:8080
```

The frontend and backend are two independent apps. You only need the backend running when using **PDF Compress** — all other tools work without it.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 24.14.0 | [nodejs.org](https://nodejs.org) |
| Java JDK | 17 | [adoptium.net](https://adoptium.net) |
| Git | any | For cloning |

> The backend includes a bundled Maven wrapper (`mvnw`), so you do **not** need Maven installed separately.

---

## Quick Start

### 1. Clone the repository

```bash
git clone <repo-url>
cd Utilities-webapp
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend is now running at **http://localhost:5173**

### 3. Start the backend (only needed for PDF Compress)

**Windows (PowerShell):**
```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17.0.17"   # adjust path if needed
.\mvnw.ps1 spring-boot:run
```

**macOS / Linux (Bash):**
```bash
cd backend
./mvnw spring-boot:run
```

Backend is now running at **http://localhost:8080**

---

## Frontend

**Stack:** React 19, Vite 8, Tailwind CSS 3, Radix UI primitives, React Router v7

### Source layout

```
frontend/src/
  components/
    ui/              Button, Card, Badge, Select (Radix UI primitives)
    layout/          Layout.jsx — sidebar navigation + dark mode toggle
  features/
    pdf-merge/       PDF merge with drag-and-drop page reordering
    compress-pdf/    PDF compression via backend API call
    compress-image/  Client-side image compression (JPEG/PNG/WebP)
    text-diff/       Word-level side-by-side diff viewer
    text-beautify/   Monaco editor with Prettier + SQL formatter support
    base64/          Auto-detecting Base64 encode/decode (text & images)
  pages/
    Home.jsx         Landing page with tool cards
  lib/
    utils.js         cn() (class merging) and formatBytes() helpers
```

### Path alias

`@` maps to `src/` — e.g. `import Layout from "@/components/layout/Layout"`.

### API proxy

Vite proxies all `/api/*` requests to `http://localhost:8080`, so the frontend never needs to know the backend port directly.

### Commands

```bash
cd frontend
npm install          # install dependencies (first time or after package.json changes)
npm run dev          # start dev server → http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview the production build locally
npm run lint         # run ESLint
```

### Key dependencies

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `@radix-ui/*` | Accessible UI primitives |
| `tailwindcss` | Utility-first CSS |
| `lucide-react` | Icons |
| `pdf-lib` | Client-side PDF creation/merge |
| `@dnd-kit/*` | Drag-and-drop for PDF page reorder |
| `diff` + `diff2html` | Text diffing engine and renderer |
| `@monaco-editor/react` | Code editor (VS Code engine) |
| `prettier` | Code formatting |
| `sql-formatter` | SQL formatting |
| `react-dropzone` | File drop zones |

---

## Backend

**Stack:** Spring Boot 3.2, Java 17, Maven (bundled wrapper), Apache PDFBox 3.0

### Purpose

The backend exists solely to handle PDF compression. PDFBox re-renders each PDF page as a compressed JPEG image and repackages them into a new PDF. This is the only operation that cannot run purely in the browser.

### API endpoints

#### `POST /api/pdf/compress`

Compress a PDF file.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (PDF) | Yes | The PDF to compress |
| `quality` | Integer (1–100) | No | JPEG quality, default `65` |

**Response:** `application/octet-stream` — compressed PDF bytes

**Example (curl):**
```bash
curl -X POST http://localhost:8080/api/pdf/compress \
  -F "file=@document.pdf" \
  -F "quality=65" \
  --output compressed.pdf
```

### Source layout

```
backend/src/main/java/com/utilkit/backend/
  BackendApplication.java               Spring Boot entry point
  config/
    CorsConfig.java                     Allows requests from localhost:5173
  controller/
    PdfController.java                  POST /api/pdf/compress endpoint
  service/
    PdfCompressionService.java          PDFBox compression logic
```

### Commands

**Windows (PowerShell):**
```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17.0.17"

.\mvnw.ps1 spring-boot:run    # run dev server → http://localhost:8080
.\mvnw.ps1 clean package      # build JAR → target/backend-0.0.1-SNAPSHOT.jar
.\mvnw.ps1 test               # run tests
```

**macOS / Linux:**
```bash
cd backend
./mvnw spring-boot:run
./mvnw clean package
./mvnw test
```

### Running the built JAR

```bash
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar
```

---

## Design Decisions

- **Client-side by default** — PDF merge, image compression, text diff, text beautify, and Base64 process everything in the browser. No network requests, no data leakage.
- **Backend only for PDF compression** — PDFBox is used server-side because reliable PDF page re-rendering requires a mature Java library. The Canvas API cannot match it for this task.
- **No auth, no persistence** — fully stateless. There is no database, no login, no session storage beyond the current tab.
- **Dark mode** — toggled via `document.documentElement.classList.toggle("dark")`. Persists for the current browser session only.
- **Vite proxy** — the `/api` proxy in `vite.config.js` means the frontend always uses relative URLs (`/api/pdf/compress`), keeping the backend port invisible to the UI code.

---

## Troubleshooting

### Frontend won't start

- Ensure Node.js >= 24.14.0: `node --version`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Backend won't start

- Ensure Java 17 is installed: `java -version`
- Ensure `JAVA_HOME` points to JDK 17 (not JRE)
- On first run, `mvnw` downloads Maven 3.9.6 — this requires internet access

### PDF Compress shows network error

- The backend must be running on port 8080
- Check that nothing else is using port 8080: `netstat -ano | findstr :8080` (Windows)

### CORS error in browser console

- The backend's `CorsConfig.java` allows only `http://localhost:5173`
- Make sure the frontend dev server is running on the default port (5173), not a different one
