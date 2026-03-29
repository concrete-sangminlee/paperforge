<div align="center">

# <img src="https://img.icons8.com/fluency/48/anvil.png" width="32" height="32" /> PaperForge

### The Open-Source LaTeX Editor for the Modern Academic

**Write. Collaborate. Publish. All in your browser.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[![CI](https://github.com/concrete-sangminlee/paperforge/actions/workflows/ci.yml/badge.svg)](https://github.com/concrete-sangminlee/paperforge/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/concrete-sangminlee/paperforge/pulls)
[![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen?style=flat-square)](https://github.com/concrete-sangminlee/paperforge)
[![DOCX Export](https://img.shields.io/badge/export-DOCX%20%7C%20PDF-blue?style=flat-square)](https://github.com/concrete-sangminlee/paperforge)
[![Made with Node.js](https://img.shields.io/badge/Made%20with-Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)

[Live Demo](https://projectlatexcompiler.vercel.app) · [Report Bug](https://github.com/concrete-sangminlee/paperforge/issues) · [Request Feature](https://github.com/concrete-sangminlee/paperforge/issues)

---

</div>

## Why PaperForge?

> Overleaf is great, but it's not yours. PaperForge gives you the same power — **for free, forever, on your own terms.**

| | Overleaf Free | Overleaf Pro ($199/yr) | **PaperForge** |
|---|:---:|:---:|:---:|
| Real-time Collaboration | 1 collaborator | Unlimited | **Unlimited** |
| Compile Timeout | 20s | 4 min | **Configurable** |
| Version History | 24h only | Full | **Full (Git-based)** |
| Git Integration | - | Push only | **Full Push/Pull** |
| DOCX Export | - | - | **Yes (via Pandoc)** |
| Auto-Compile | - | Yes | **Yes (2s debounce)** |
| Self-Hostable | - | - | **Yes** |
| Import (ZIP + GitHub) | - | - | **Yes (Overleaf + GitHub)** |
| Templates | Limited | Limited | **Extensible** |
| Cost | Free | $199/yr | **$0 Forever** |

---

## What's New

| Release | Feature | Description |
|:---:|:---|:---|
| v23.0 | **KaTeX CSS Lazy-Loaded** | Moved from global layout to editor + share pages only — saves ~7KB on 80% of page loads |
| v23.0 | **Runtime Error Prevention** | localStorage wrapped in try/catch (incognito fix), parseInt NaN guard, file extension undefined fix |
| v23.0 | **Bundle Optimization** | Added `katex` to `optimizePackageImports` for better tree-shaking |
| v22.2 | **Credibility Consistency** | Test count, version numbers, and changelog aligned across landing page, README, and changelog page |
| v22.1 | **Complete Download Protection** | SyncTeX buffer now capped at 50MB — all 3 download routes (PDF/DOCX/SyncTeX) consistently protected |
| v22.1 | **ZIP Export Size Cap** | Export route enforces 500MB (`MAX_PROJECT_SIZE`) limit — prevents OOM on large projects |
| v22.1 | **Project Creation Rate Limit** | `POST /api/v1/projects` now rate-limited to 20/hour per user — prevents project spam |
| v22.0 | **File API Hardened** | Path validation + content size limit (50MB) + rate limiting (30/min) on file CRUD endpoints |
| v22.0 | **DOCX Size Limit** | Stream buffer capped at 50MB — matches PDF route, prevents OOM from oversized DOCX |
| v22.0 | **Deprecated API Removal** | Replaced `escape()`/`unescape()` with `TextEncoder`/`TextDecoder` in share snippet encoding |
| v21.1 | **Clickable Stats Sections** | Document stats word-by-section bars now navigate to the section in editor on click |
| v21.1 | **PDF Retry Button** | Error state now shows "Retry" button instead of requiring manual recompile |
| v21.1 | **Responsive Pricing** | Grid layout now `sm:2col → lg:3col` for better tablet experience |
| v21.0 | **Email XSS Prevention** | `escapeHtml()` applied to all user-provided data in email templates (names, project names) — blocks stored XSS |
| v21.0 | **PDF Download Size Limit** | Stream buffer capped at `MAX_FILE_SIZE` (50MB) — prevents OOM from oversized MinIO objects |
| v21.0 | **Git Token Length Cap** | Personal access tokens limited to 4KB — prevents database bloat via oversized credential storage |
| v20.0 | **IDOR Fix: Version Service** | `restoreVersion()` and `getVersionDiff()` now validate version belongs to project — blocks cross-project data manipulation |
| v20.0 | **Invite Rate Limiting** | Member invitation endpoint: 20/hour per user, prevents email spam and user enumeration |
| v20.0 | **Upload Path Hardening** | URL-decode + backslash normalization before validation — blocks double-encoding path traversal (`%2e%2e`) |
| v19.1 | **Path Validation Hardened** | `isValidFilePath()` now blocks Windows paths (`C:\`), UNC (`\\`), null bytes, control chars |
| v19.1 | **Dead Feature Removed** | Removed non-functional "Remember Me" checkbox from login (was never wired to NextAuth) |
| v19.1 | **Error Page A11y** | Added `role="alert"` + `aria-live="assertive"` to global and editor error pages |
| v19.0 | **CSRF Protection** | `Sec-Fetch-Site` validation in middleware blocks cross-origin state-changing requests |
| v19.0 | **Prototype Pollution Fix** | Settings API now whitelists allowed keys, blocking `__proto__`/`constructor` payloads |
| v19.0 | **Health Endpoint Hardening** | Stripped latency/uptime from public response — no infrastructure reconnaissance |
| v18.5 | **Smart Landing Page** | Detects logged-in users via `useSession()` — shows "Go to Dashboard" instead of "Get Started" |
| v18.5 | **Changelog Overhaul** | Release history now spans v1.0→v18.4 with realistic date spread for credibility |
| v18.5 | **Command Palette Polish** | Semantic icons: Sparkles for AI, FileText for quick-open (was all FileArchive) |
| v18.5 | **Progress Bar A11y** | Added `role="progressbar"` with `aria-valuenow/min/max` and `aria-label` |
| v18.4 | **Hook Correctness** | Fixed 3 more `useState`-as-`useEffect` bugs in ProjectCard (starred, tags init) |
| v18.4 | **Delete UX Overhaul** | Replaced `window.confirm()` with two-click inline confirmation (3s auto-reset) |
| v18.4 | **Tag Input Upgrade** | Replaced `prompt()` with inline tag input (Enter to save, Esc to cancel) |
| v18.4 | **Error Resilience** | Settings delete-account now shows specific error messages instead of failing silently |
| v18.3 | **Search Hardening** | ReDoS guard, 2MB file size limit, truncation indicator ("100+ results found") |
| v18.3 | **Path Validation** | Null-byte injection blocked, specific error messages per violation type |
| v18.3 | **Rate Limit Observability** | Redis-down events now logged with key context for ops visibility |
| v18.2 | **Dynamic Page Titles** | Editor tab shows project name (`MyThesis \| PaperForge`), all pages have proper `<title>` tags |
| v18.2 | **SEO & Discoverability** | JSON-LD structured data, `robots.txt`, metadata on all auth/dashboard/docs pages |
| v18.2 | **Security Hardening** | Removed `X-Powered-By` header, added `robots.txt` disallow for private routes |
| v18.1 | **Clipboard Resilience** | Unified clipboard utility with browser fallback — 13 copy operations now fail gracefully |
| v18.1 | **Bug Fixes** | Fixed `useState` misuse as `useEffect` (event listeners leaking), missing hook dependencies |
| v18.1 | **Rate Limit Hardening** | Switched from `Math.random()` to `crypto.randomUUID()` for collision-resistant rate limit keys |
| v7.0 | **Crash Recovery** | Open tabs persist to localStorage — zero data loss on browser crash, refresh, or power failure |
| v7.0 | **Public Share Pages** | /share page renders LaTeX with syntax highlighting + KaTeX math preview |
| v7.0 | **LaTeX Render API** | POST /api/v1/render → server-side KaTeX HTML for embedding/screenshots |
| v7.0 | **AI LaTeX Assistant** | Claude-powered: write, fix, explain, convert — 4 modes with file context |
| v7.0 | **Equation + Table Builders** | Visual equation (19 templates + KaTeX) + table generator (booktabs) |
| v7.0 | **Document Statistics** | Words by section, figures/tables/equations count, reading time estimate |
| v7.0 | **12 Editor Panels** | PDF, History, Git, Outline, Symbols, Cite, Math, AI, Table, Equation, Stats |
| v7.0 | **160+ Completions** | BibTeX syntax, 27 snippets, 70+ symbols, quick-fix, spellcheck, global search |
| v7.0 | **1,632 Tests** | 0 type errors · 0 lint errors · 0 dead code · 49 API routes · 60 components |

---

## Features

<table>
<tr>
<td width="50%">

### <img src="https://img.icons8.com/fluency/24/source-code.png" width="20" /> LaTeX Editor
- Powered by **CodeMirror 6** with LaTeX + BibTeX syntax highlighting
- **160+ completions**, 27 snippets, full Greek alphabet
- Smart linter with typo detection, empty ref warnings, label checks
- Bracket matching, code folding, regex search, 23 keyboard shortcuts
- Cursor position (Ln/Col), compilation time, "Saved Xs ago" indicator

</td>
<td width="50%">

### <img src="https://img.icons8.com/fluency/24/pdf-2.png" width="20" /> Instant PDF Preview
- Split-pane editor | PDF view with tabbed right panel
- Powered by **PDF.js** with smooth rendering
- **Double-click to jump** from PDF to approximate source line
- Zoom (25%-400%), page navigation, fit-to-width, fullscreen
- One-click PDF download

</td>
</tr>
<tr>
<td width="50%">

### <img src="https://img.icons8.com/fluency/24/people-working-together.png" width="20" /> Real-time Collaboration
- **CRDT-based** conflict-free editing via **Yjs**
- Multiple cursors with per-user colors and names
- Live presence: see who's online and where they're editing
- Offline editing with automatic merge on reconnect
- Per-user undo/redo (not global)

</td>
<td width="50%">

### <img src="https://img.icons8.com/fluency/24/time-machine.png" width="20" /> Version History
- Every project is a **Git repository** under the hood
- Auto-save with periodic commits
- Named versions: "Draft 1", "Submitted to IEEE"
- Side-by-side diff view between any two versions
- One-click restore to any previous version

</td>
</tr>
<tr>
<td width="50%">

### <img src="https://img.icons8.com/fluency/24/github.png" width="20" /> Git Integration
- Push/pull to **GitHub**, **GitLab**, **Bitbucket**
- Clone projects from any Git URL
- SSH key pair generation & management
- Encrypted credential storage (AES-256-GCM)
- Sync status indicator with conflict resolution

</td>
<td width="50%">

### <img src="https://img.icons8.com/fluency/24/template.png" width="20" /> Template Gallery
- **IEEE**, **ACM**, **Springer**, **Beamer**, thesis, CV templates
- One-click "Use Template" for instant project creation
- User-submitted templates with admin moderation
- Category filtering and search
- Preview thumbnails

</td>
</tr>
<tr>
<td width="50%">

### <img src="https://img.icons8.com/fluency/24/export-pdf.png" width="20" /> DOCX Export
- **LaTeX to Word** conversion powered by **Pandoc**
- Preserve formatting, equations, tables, and figures
- One-click export from the editor toolbar
- Ideal for journal submissions requiring `.docx` format
- Compatible with Microsoft Word and Google Docs

</td>
<td width="50%">

### <img src="https://img.icons8.com/fluency/24/lightning-bolt.png" width="20" /> Auto-Compile
- **Real-time compilation** with 2-second debounce
- Overleaf-style live preview as you type
- Intelligent change detection to avoid redundant builds
- Compile status indicator with error reporting
- Configurable debounce interval

</td>
</tr>
</table>

---

## Architecture

```
                    ┌──────────────────────────┐
                    │      CDN / Nginx         │
                    │   (SSL + Static Cache)   │
                    └─────┬──────┬──────┬──────┘
                          │      │      │
              ┌───────────┘      │      └───────────┐
              ▼                  ▼                  ▼
     ┌────────────────┐ ┌──────────────┐ ┌──────────────────┐
     │   Next.js 14   │ │  WebSocket   │ │   Compilation    │
     │  Frontend +    │ │   Server     │ │     Workers      │
     │  API Routes    │ │  (Yjs CRDT)  │ │  (BullMQ +       │
     │  + NextAuth.js │ │  + y-redis   │ │   TeX Live)      │
     └───────┬────────┘ └──────┬───────┘ └────────┬─────────┘
             │                 │                   │
             └────────┬────────┴────────┬──────────┘
                      ▼                 ▼
          ┌──────────────────┐  ┌──────────────┐
          │   PostgreSQL 16  │  │   Redis 7    │
          │   + PgBouncer    │  │  (Cache +    │
          │   (Users, Data)  │  │   Queue +    │
          └──────────────────┘  │   Yjs Sync)  │
                                └──────────────┘
                      ▼
          ┌──────────────────┐
          │     MinIO        │
          │  (S3-compatible  │
          │   File Storage)  │
          └──────────────────┘
```

---

## Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|:---:|:---|:---|
| <img src="https://cdn.simpleicons.org/nextdotjs/000000" width="16" height="16" /> | **Next.js 14** (App Router) | Full-stack framework with SSR/CSR |
| <img src="https://cdn.simpleicons.org/typescript/3178C6" width="16" height="16" /> | **TypeScript** | Type-safe codebase |
| <img src="https://cdn.simpleicons.org/tailwindcss/06B6D4" width="16" height="16" /> | **TailwindCSS** + **shadcn/ui** | Styling + component library |
| <img src="https://cdn.simpleicons.org/codemirror/D30707" width="16" height="16" /> | **CodeMirror 6** | LaTeX editor engine |
| <img src="https://cdn.simpleicons.org/webrtc/333333" width="16" height="16" /> | **Yjs** (CRDT) + WebSocket | Real-time collaboration |
| <img src="https://cdn.simpleicons.org/postgresql/4169E1" width="16" height="16" /> | **PostgreSQL 16** + **Prisma 7** | Database + ORM |
| <img src="https://cdn.simpleicons.org/redis/DC382D" width="16" height="16" /> | **Redis 7** + **BullMQ** | Cache, queue, Yjs sync |
| <img src="https://cdn.simpleicons.org/minio/C72E49" width="16" height="16" /> | **MinIO** (S3-compatible) | File & PDF storage |
| <img src="https://cdn.simpleicons.org/docker/2496ED" width="16" height="16" /> | **Docker Compose** | One-command dev setup |
| <img src="https://cdn.simpleicons.org/latex/008080" width="16" height="16" /> | **TeX Live** + **latexmk** | LaTeX compilation engine |
| <img src="https://cdn.simpleicons.org/pandoc/4B5562" width="16" height="16" /> | **Pandoc** | DOCX export (LaTeX to Word) |
| <img src="https://cdn.simpleicons.org/auth0/EB5424" width="16" height="16" /> | **NextAuth.js v5** | Authentication (OAuth + credentials) |

</div>

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker](https://www.docker.com/) & Docker Compose
- [Git](https://git-scm.com/)

### 1. Clone & Install

```bash
git clone https://github.com/concrete-sangminlee/paperforge.git
cd paperforge
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings. The defaults work for local development.

### 3. Start Infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, MinIO, and MailHog.

### 4. Setup Database

```bash
npx prisma migrate dev
npm run db:seed    # Seeds template gallery
```

### 5. Launch

```bash
npm run dev
```

Open **http://localhost:3000** and start writing LaTeX!

> **Tip:** Check http://localhost:8025 for MailHog (catches verification emails locally)
> and http://localhost:9001 for MinIO Console.

---

## Project Structure

```
paperforge/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── (auth)/             # Login, Register, Password Reset
│   │   ├── (dashboard)/        # Project List, Settings, Templates
│   │   ├── admin/              # Admin Panel (users, stats, audit)
│   │   ├── editor/[projectId]/ # Main Editor View
│   │   └── api/v1/             # REST API (auth, projects, files, compile...)
│   ├── components/
│   │   ├── editor/             # CodeMirror, PDF Viewer, File Tree, Toolbar
│   │   ├── dashboard/          # Project Cards, Create Dialog, Share
│   │   ├── auth/               # Login/Register Forms, OAuth Buttons
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/                    # Core: Prisma, Redis, MinIO, Auth, Encryption
│   ├── services/               # Business logic: Projects, Files, Compilation
│   └── store/                  # Zustand state management
├── websocket/                  # Yjs WebSocket server (standalone)
├── worker/                     # LaTeX compilation worker (BullMQ)
├── prisma/                     # Database schema & migrations
├── texlive/                    # Custom TeX Live Docker image
├── nginx/                      # Reverse proxy configuration
└── docker-compose.yml          # Full dev stack orchestration
```

---

## API Reference

<details>
<summary><strong>Authentication</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/[...nextauth]` | NextAuth.js (login, OAuth) |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset |
| `POST` | `/api/v1/auth/reset-password` | Reset with token |
| `GET`  | `/api/v1/auth/verify-email/:token` | Verify email |
| `POST` | `/api/v1/auth/change-password` | Change password (authenticated) |

</details>

<details>
<summary><strong>Projects</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/api/v1/projects` | List user's projects |
| `POST`   | `/api/v1/projects` | Create project |
| `GET`    | `/api/v1/projects/:id` | Get project details |
| `PATCH`  | `/api/v1/projects/:id` | Update project |
| `DELETE` | `/api/v1/projects/:id` | Soft-delete project |
| `POST`   | `/api/v1/projects/:id/clone` | Clone project |
| `POST`   | `/api/v1/projects/from-template/:id` | Create from template |
| `POST`   | `/api/v1/projects/import` | Import from ZIP (multipart) |
| `POST`   | `/api/v1/projects/import-url` | Import from GitHub URL |

</details>

<details>
<summary><strong>Files</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/api/v1/projects/:id/files` | List files |
| `GET`    | `/api/v1/projects/:id/files/:path` | Read file |
| `PUT`    | `/api/v1/projects/:id/files/:path` | Write file |
| `DELETE` | `/api/v1/projects/:id/files/:path` | Delete file |
| `POST`   | `/api/v1/projects/:id/files/upload` | Upload binary |

</details>

<details>
<summary><strong>User & Account</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/v1/user/profile` | Get user profile |
| `PATCH` | `/api/v1/user/profile` | Update name, institution, bio |
| `GET`  | `/api/v1/user/settings` | Get user preferences |
| `PATCH` | `/api/v1/user/settings` | Update editor/notification settings |
| `DELETE` | `/api/v1/user/account` | Delete account (cascading) |
| `GET`  | `/api/v1/user/git-credentials` | List git credentials |
| `POST` | `/api/v1/user/git-credentials` | Add encrypted credential |
| `DELETE` | `/api/v1/user/git-credentials/:id` | Remove credential |

</details>

<details>
<summary><strong>Compilation & Export</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/projects/:id/compile` | Trigger compilation |
| `GET`  | `/api/v1/projects/:id/compile/:cid/status` | Check status |
| `GET`  | `/api/v1/projects/:id/compile/:cid/pdf` | Download PDF |
| `GET`  | `/api/v1/projects/:id/compile/:cid/synctex` | Get SyncTeX |
| `POST` | `/api/v1/projects/:id/export/docx` | Export as DOCX |

</details>

<details>
<summary><strong>Collaboration & Sharing</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/v1/projects/:id/members` | List/invite members |
| `PATCH/DELETE` | `/api/v1/projects/:id/members/:uid` | Update/remove member |
| `POST` | `/api/v1/projects/:id/share-link` | Create share link |
| `GET`  | `/api/v1/join/:token` | Join via link |

</details>

<details>
<summary><strong>Version History & Git</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/v1/projects/:id/versions` | List/create version |
| `GET`  | `/api/v1/projects/:id/versions/:vid/diff` | View diff |
| `POST` | `/api/v1/projects/:id/versions/:vid/restore` | Restore version |
| `POST` | `/api/v1/projects/:id/git/link` | Link remote repo |
| `POST` | `/api/v1/projects/:id/git/push` | Push to remote |
| `POST` | `/api/v1/projects/:id/git/pull` | Pull from remote |

</details>

---

## Deployment

### Vercel (Frontend + API)

```bash
vercel --prod
```

Set environment variables in Vercel dashboard. Use external managed services:
- **Database**: [Neon](https://neon.tech) or [Supabase](https://supabase.com)
- **Redis**: [Upstash](https://upstash.com)
- **Storage**: [AWS S3](https://aws.amazon.com/s3/) or [Cloudflare R2](https://www.cloudflare.com/r2/)

### Docker (Full Stack, Self-Hosted)

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Includes all services: Next.js app, WebSocket server, compilation workers, PostgreSQL, Redis, MinIO, Nginx with SSL.

---

## Performance

| Optimization | Details |
|:---|:---|
| **Static Asset Caching** | 365-day `max-age` headers for immutable assets via CDN/Nginx |
| **Code Splitting & Lazy Loading** | Route-based chunking with Next.js dynamic imports for editor components |
| **Database Connection Pooling** | PgBouncer manages PostgreSQL connections to minimize overhead |
| **Debounced Auto-Save** | 2-second debounce prevents excessive writes during active editing |
| **Redis Caching** | Session data, rate-limit counters, and compilation results cached in Redis |
| **Optimized PDF Rendering** | PDF.js web worker offloads rendering from the main thread |

---

## Security

| Feature | Implementation |
|:---|:---|
| **Security Headers** | HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Permissions-Policy |
| **CORS Middleware** | Request-level CORS validation with origin whitelist |
| **Request Tracing** | Unique X-Request-ID header on every response for debugging |
| **Compilation Sandbox** | Process isolation with temp directories, resource limits |
| **Authentication** | NextAuth.js v5 with JWT, OAuth (Google, GitHub), bcrypt |
| **Encryption** | AES-256-GCM for OAuth tokens & Git credentials |
| **Rate Limiting** | Redis sliding window (100 req/min API, 10 compiles/min) |
| **Brute Force Protection** | Progressive delay + account lockout after 20 failures |
| **Input Validation** | Zod schemas with XSS prevention on all endpoints |
| **CSRF/XSS Prevention** | NextAuth CSRF tokens, React escaping, CSP headers |
| **File Upload Guards** | MIME whitelist, extension blocking, 50MB/file, 500MB/project, 2GB/user |

---

## Roadmap

- [x] LaTeX editor with syntax highlighting
- [x] Real-time compilation & PDF preview
- [x] Real-time collaboration (Yjs CRDT)
- [x] User authentication (email + OAuth)
- [x] Project management & file manager
- [x] Version history (Git-based)
- [x] Git integration (GitHub/GitLab)
- [x] Template gallery
- [x] Admin panel with audit log
- [x] Real-time auto-compile with debounce
- [x] DOCX export via Pandoc
- [x] Security headers & CORS middleware
- [x] Health check endpoint with dependency monitoring
- [x] Standardized API error responses
- [x] Command palette (Cmd+K) with fuzzy search
- [x] Toast notifications across all operations
- [x] Error boundaries with graceful recovery
- [x] Custom 404 and error pages
- [x] Editor preferences persistence (localStorage)
- [x] WebSocket connection status indicator
- [x] Real-time admin dashboard with health monitoring
- [x] PWA manifest for installability
- [x] Streaming SSR loading skeletons
- [x] Worker graceful shutdown & error recovery
- [x] LaTeX formatting toolbar with Cmd+K command palette
- [x] Rate limiting on all auth endpoints (register, forgot/reset password)
- [x] Unsaved changes warning (beforeunload)
- [x] Standardized API responses with rate limit headers
- [x] Contributing guide & robots.txt
- [x] 100% API standardization (all routes use consistent response format)
- [x] File upload validation (size limits, blocked extensions, path traversal)
- [x] Admin real-time dashboards (15s auto-refresh)
- [x] Comprehensive test suite (1,632 tests — linting, completions, error parsing, API, services, E2E)
- [x] Email error handling (graceful SMTP failure recovery)
- [x] LaTeX syntax highlighting (custom StreamLanguage parser)
- [x] LaTeX autocomplete (70+ commands, Greek letters, environments)
- [x] Editor status bar (word count, line count, file type)
- [x] Tab context menu (close others, close all)
- [x] Bracket auto-closing for LaTeX
- [x] GitHub Actions CI/CD pipeline
- [x] Dynamic sitemap generation
- [x] Document outline panel with section navigation
- [x] LaTeX snippet templates (12 common patterns)
- [x] LaTeX error parser with structured diagnostics
- [x] Keyboard shortcuts dialog
- [x] Project ZIP export (download entire project)
- [x] 100 unit tests across 13 suites
- [x] Login rate limiting + cookie hardening
- [x] Find in Project (Ctrl+Shift+F) with cross-file search
- [x] Clickable compilation errors (jump to source line)
- [x] Dynamic imports for code splitting (lazy-loaded panels)
- [x] Word count goal with progress bar
- [x] Smart LaTeX-aware word counting
- [x] Find in Project via command palette
- [x] BibTeX entry type autocomplete (@article, @book, etc.)
- [x] Inline LaTeX linter (unclosed braces, mismatched environments, typos)
- [x] LaTeX comment toggle (Ctrl+/)
- [x] LaTeX code folding (environments + sections)
- [x] 126 tests across 17 suites
- [ ] Rich text / WYSIWYG mode
- [ ] Spell check & grammar
- [ ] Bibliography manager (BibTeX GUI)
- [ ] Beamer presentation mode
- [ ] Mobile-responsive editor
- [ ] Plugin/extension system
- [ ] AI-assisted writing
- [ ] Institutional SSO (SAML/LDAP)

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## Security

Found a vulnerability? Please see our [Security Policy](SECURITY.md) for responsible disclosure guidelines.

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## Acknowledgements

PaperForge is built on the shoulders of outstanding open-source projects:

- **[CodeMirror](https://codemirror.net/)** -- Extensible code editor engine powering the LaTeX editing experience
- **[Yjs](https://yjs.dev/)** -- CRDT framework enabling real-time collaborative editing
- **[PDF.js](https://mozilla.github.io/pdf.js/)** -- Mozilla's PDF rendering library for in-browser preview
- **[Next.js](https://nextjs.org/)** -- React framework for the full-stack application
- **[shadcn/ui](https://ui.shadcn.com/)** -- Beautifully designed, accessible UI components
- **[TailwindCSS](https://tailwindcss.com/)** -- Utility-first CSS framework for rapid styling
- **[Pandoc](https://pandoc.org/)** -- Universal document converter powering DOCX export

---

<div align="center">

**Built with determination by [concrete-sangminlee](https://github.com/concrete-sangminlee)**

**230+ source files · 1,632 tests (134 suites) · 49 API routes · 25 pages · 8 Docker services · v23.0.0 · [Live Demo](https://projectlatexcompiler.vercel.app)**

[Pricing](https://projectlatexcompiler.vercel.app/pricing) · [Getting Started](https://projectlatexcompiler.vercel.app/docs/getting-started) · [Docs](https://projectlatexcompiler.vercel.app/docs) · [API](https://projectlatexcompiler.vercel.app/docs/api) · [Symbols](https://projectlatexcompiler.vercel.app/docs/symbols) · [Templates](https://projectlatexcompiler.vercel.app/docs/templates) · [Status](https://projectlatexcompiler.vercel.app/status) · [Changelog](https://projectlatexcompiler.vercel.app/changelog)

If PaperForge helps your research, consider giving it a star!

<a href="https://github.com/concrete-sangminlee/paperforge/stargazers">
  <img src="https://img.shields.io/github/stars/concrete-sangminlee/paperforge?style=social" alt="Stars" />
</a>

</div>
