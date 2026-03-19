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
| Self-Hostable | - | - | **Yes** |
| Templates | Limited | Limited | **Extensible** |
| Cost | Free | $199/yr | **$0 Forever** |

---

## Features

<table>
<tr>
<td width="50%">

### <img src="https://img.icons8.com/fluency/24/source-code.png" width="20" /> LaTeX Editor
- Powered by **CodeMirror 6** with full LaTeX syntax highlighting
- Auto-completion for commands, environments, citations
- Bracket matching, code folding, regex search
- Light & Dark themes with VIM/Emacs keybindings
- Inline error highlighting from compiler output

</td>
<td width="50%">

### <img src="https://img.icons8.com/fluency/24/pdf-2.png" width="20" /> Instant PDF Preview
- Split-pane editor | PDF view with resizable divider
- Powered by **PDF.js** with smooth rendering
- SyncTeX: click source to jump to PDF, and vice versa
- Zoom, page navigation, fit-to-width
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
<summary><strong>Compilation</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/projects/:id/compile` | Trigger compilation |
| `GET`  | `/api/v1/projects/:id/compile/:cid/status` | Check status |
| `GET`  | `/api/v1/projects/:id/compile/:cid/pdf` | Download PDF |
| `GET`  | `/api/v1/projects/:id/compile/:cid/synctex` | Get SyncTeX |

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

## Security

| Feature | Implementation |
|---------|---------------|
| **Compilation Sandbox** | nsjail process isolation, no shell escape, resource limits |
| **Authentication** | NextAuth.js v5 with JWT, OAuth (Google, GitHub), bcrypt |
| **Encryption** | AES-256-GCM for OAuth tokens & Git credentials |
| **Rate Limiting** | Redis sliding window (100 req/min API, 10 compiles/min) |
| **Brute Force** | Progressive delay + account lockout after 20 failures |
| **Input Validation** | Zod schemas on all endpoints |
| **CSRF/XSS** | NextAuth CSRF tokens, React escaping, CSP headers |
| **File Upload** | Type validation, 50MB/file, 500MB/project, 2GB/user |

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

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">

**Built with determination by [concrete-sangminlee](https://github.com/concrete-sangminlee)**

If PaperForge helps your research, consider giving it a star!

<a href="https://github.com/concrete-sangminlee/paperforge/stargazers">
  <img src="https://img.shields.io/github/stars/concrete-sangminlee/paperforge?style=social" alt="Stars" />
</a>

</div>
