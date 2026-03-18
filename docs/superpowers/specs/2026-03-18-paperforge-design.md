# PaperForge — Design Specification

**Date**: 2026-03-18
**Status**: Draft v3 (final review fixes)
**Author**: Claude (with user direction)

## 1. Overview

PaperForge is a free, open-source, web-based LaTeX editor — a self-hostable alternative to Overleaf. It provides real-time collaborative editing, instant LaTeX compilation with PDF preview, version history, Git integration, and a template gallery. The service is designed as a public platform where anyone can sign up and use it.

## 2. Goals & Success Criteria

- **Instant feedback**: LaTeX source changes compile and render in PDF within seconds
- **Real-time collaboration**: Multiple users edit the same document simultaneously without conflicts
- **Full project management**: File trees, sharing, templates, version history
- **Git integration**: Push/pull to GitHub, GitLab, Bitbucket
- **Security**: Sandboxed compilation, no shell escape, resource limits
- **Scalability**: Horizontal scaling of compilation workers for public service load
- **Self-hostable**: Docker Compose one-command setup for anyone who wants to run their own instance

## 3. Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│              CDN (CloudFlare / custom)                   │
│         Static assets, PDF.js, fonts, CSS/JS            │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  Nginx (Reverse Proxy + SSL)             │
└──────┬──────────────┬───────────────┬───────────────────┘
       │              │               │
┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────────┐
│  Next.js    │ │ WebSocket  │ │  Next.js API    │
│  Frontend   │ │ Server     │ │  Routes         │
│  (SSR/CSR)  │ │ (Yjs CRDT) │ │  (REST + Auth)  │
│             │ │ + y-redis  │ │  + NextAuth.js  │
└──────┬──────┘ └─────┬──────┘ └──────┬──────────┘
       └──────────────┼───────────────┘
                      │
       ┌──────────────┼───────────────┬──────────────┐
┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│ PostgreSQL  │ │   Redis    │ │   MinIO    │ │   SMTP     │
│ + PgBouncer │ │ (Cache,    │ │ (Files,    │ │ (Email     │
│ (Users,     │ │  BullMQ,   │ │  PDFs)     │ │  Delivery) │
│  Projects)  │ │  Yjs sync) │ │            │ │            │
└─────────────┘ └─────┬──────┘ └────────────┘ └────────────┘
                      │
               ┌──────▼──────┐
               │  TeX Live   │
               │  Warm Pool  │
               │  (nsjail)   │
               └─────────────┘
```

### 3.2 Services

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| Frontend + API | Next.js 14 (App Router) + NextAuth.js | 3000 | SSR/CSR web app, REST API, authentication |
| WebSocket Server | y-websocket + y-redis + TypeScript | 4001 | Real-time collaborative editing via Yjs |
| Compilation Workers | Node.js + BullMQ + nsjail | — | LaTeX compilation in sandboxed warm pool |
| PostgreSQL | PostgreSQL 16 + PgBouncer | 5432 | Users, projects, metadata |
| Redis | Redis 7 | 6379 | Session cache, BullMQ queue, Yjs cross-instance sync, rate limiting |
| MinIO | MinIO | 9000 | S3-compatible object storage for files and PDFs |
| SMTP Relay | Nodemailer + configurable SMTP (SendGrid/SES/self-hosted) | 587 | Email verification, password reset, invitations |
| CDN | CloudFlare or self-hosted Nginx cache | 80/443 | Static assets, fonts, PDF.js with cache headers |
| Nginx | Nginx | 80/443 | Reverse proxy, SSL termination, WebSocket sticky sessions by projectId |

### 3.3 Authentication Ownership

All authentication lives in the **Next.js application** via NextAuth.js API routes (`/api/v1/auth/*`). The Next.js app handles:
- NextAuth.js credential + OAuth provider configuration
- Session management (JWT strategy with httpOnly cookies)
- All `/api/v1/*` business logic routes (REST API)

The WebSocket server validates sessions by calling a shared JWT verification function (same secret key) — it does NOT run NextAuth.js itself.

## 4. Technology Stack

### 4.1 Frontend

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Editor**: CodeMirror 6 with custom LaTeX language support
- **Styling**: TailwindCSS + shadcn/ui component library
- **PDF Viewer**: PDF.js with custom SyncTeX integration
- **Real-time**: Yjs client with y-websocket provider
- **State Management**: Zustand (lightweight, minimal boilerplate)
- **HTTP Client**: Built-in fetch with SWR for data fetching

### 4.2 Backend

- **API + Auth**: Next.js API routes + NextAuth.js (credentials + OAuth providers)
- **ORM**: Prisma (type-safe database access) + PgBouncer for connection pooling
- **Job Queue**: BullMQ (Redis-backed compilation queue) with retry and dead-letter queue
- **Git Operations**: isomorphic-git (pure JS Git implementation)
  - Known limitations: no submodule support, limited merge strategies
  - Repository size limit: 500MB per project; git gc runs weekly
- **File Storage**: MinIO SDK (S3-compatible API)
- **Email**: Nodemailer with configurable SMTP transport
- **Validation**: Zod (runtime type validation)

### 4.3 Infrastructure

- **Containerization**: Docker + Docker Compose
- **LaTeX Engine**: TeX Live (custom optimized image ~2GB with curated packages, not full 7GB install; on-demand tlmgr package installation for missing packages)
- **Compilation Sandbox**: nsjail (process-level sandbox, no container-per-compilation overhead)
- **Warm Pool**: Pre-started sandbox processes waiting for compilation jobs (eliminates cold start)
- **Reverse Proxy**: Nginx with sticky sessions (route WebSocket by projectId hash)
- **CDN**: CloudFlare or Nginx cache layer for static assets (cache-control: immutable for hashed assets)
- **Production Orchestration**: Kubernetes + Helm Charts
- **Monitoring**: Prometheus + Grafana
- **SSL**: Let's Encrypt (certbot)
- **Backup**: pg_dump daily + MinIO bucket replication (see Section 13)

## 5. Core Features

### 5.1 LaTeX Editor (CodeMirror 6)

- Syntax highlighting for LaTeX, BibTeX, and related formats
- Auto-completion for LaTeX commands, environments, citations, and labels
- Bracket matching and auto-closing
- Code folding for environments and sections
- Multiple file tabs with file tree navigation
- VIM and Emacs keybinding modes (optional)
- Error markers: inline display of compilation errors at the relevant source line
- Search and replace with regex support
- Configurable font size, theme (light/dark), word wrap

### 5.2 Real-time Compilation

- **Trigger**: Auto-compile on save with 2-second debounce
- **Queue**: BullMQ job queue with 3 priority levels:
  - High: manual compile button click
  - Normal: auto-compile on save
  - Low: template preview generation
- **Concurrency**: One active compilation per project. If a new compilation is requested while one is running, the running job completes and the new one is queued (deduplication: only the latest request survives in queue)
- **Execution**: nsjail sandbox from warm pool (no container startup overhead)
  - Supported compilers: pdflatex, xelatex, lualatex
  - Build tool: latexmk (wraps the above compilers, handles multi-pass automatically)
  - `--no-shell-escape` enforced by default
  - Timeout: 60 seconds
  - Memory limit: 1GB
  - CPU limit: 1 core
  - No network access
- **Retry**: Failed jobs retry once with exponential backoff; persistent failures go to dead-letter queue
- **Output**: PDF file stored in MinIO, compilation log streamed via WebSocket (reuses existing connection, no separate SSE)
- **Incremental builds**: Cache auxiliary files (.aux, .toc, .bbl) in per-project MinIO prefix between compilations
- **SyncTeX**: Generate .synctex.gz for source ↔ PDF mapping
- **Warm Pool**: 5 pre-started nsjail sandboxes (configurable). When a job completes, the sandbox is reset and returned to pool. New sandboxes are created if pool is empty (with ~50ms creation penalty).
- **Sandbox reset procedure**: (1) kill all child processes in the namespace, (2) unmount and wipe /tmp, (3) clear all environment variables, (4) reset user/PID namespace, (5) verify clean state before returning to pool. This ensures zero state leakage between compilations.

### 5.3 PDF Preview (PDF.js + SyncTeX)

- Split-pane view: editor (left) | PDF (right), resizable divider
- Forward search (SyncTeX): Ctrl+Click in editor → highlight corresponding PDF region
- Inverse search (SyncTeX): Double-click in PDF → jump to corresponding source line
- Zoom controls, page navigation, fit-to-width/fit-to-page
- Compilation status indicator (compiling/success/error)
- PDF download button

### 5.4 Real-time Collaborative Editing (Yjs CRDT)

- Conflict-free simultaneous editing by multiple users
- Per-user cursors with distinct colors and name labels
- Presence awareness: list of active collaborators
- Offline editing with automatic merge on reconnect
- Undo/redo per user (not global)
- WebSocket connection with automatic reconnection and exponential backoff
- **Persistence**: Yjs document state is persisted to Redis (y-redis provider) on every update. On WebSocket server restart, documents are restored from Redis. Periodically (every 2 minutes or on last-user-disconnect), the Yjs document is flushed to MinIO as the canonical file content and committed to the project's Git repository.
- **Redis HA for Yjs**: Production deployments should use Redis Sentinel or Redis Cluster for the Yjs persistence layer. The 2-minute flush interval (down from 5) limits data loss to 2 minutes in worst-case Redis failure.
- **Source of truth lifecycle**:
  1. During active editing: Yjs in-memory (synced to Redis for durability)
  2. On flush (every 2 minutes / last-user disconnect): Yjs → MinIO file content + Git commit
  3. On project open (no active editors): MinIO file content → Yjs document initialization
  4. For compilation: always reads from latest Yjs state (or MinIO if no active session)

### 5.5 User Authentication

- **Auth provider**: NextAuth.js running in Next.js API routes
- Email/password registration with bcrypt hashing
  - Password requirements: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit
- OAuth providers: Google, GitHub, ORCID
- Email verification via signed JWT token (no DB table needed; token embeds user ID + expiry, verified by signature)
- Password reset flow: signed JWT token sent via email, 1-hour expiry
- **Session management**:
  - JWT strategy with 15-minute access token expiry
  - Refresh token rotation with 7-day expiry, stored in httpOnly cookie
  - On password change or account suspension: refresh token family revoked via Redis blacklist
- **Brute-force protection**: After 5 failed login attempts, progressive delay (1s, 2s, 4s, 8s...) per IP+email combination, tracked in Redis. Account lockout after 20 failures within 1 hour; unlock via email.
- **Email delivery**: Nodemailer with configurable SMTP transport (supports SendGrid, AWS SES, or self-hosted SMTP)
- User profile: display name, avatar, institution, bio
- User settings: default compiler, editor theme, keybindings, auto-compile toggle
- **Storage quota**: 2GB per user (sum of all projects). Displayed in dashboard. Admin-configurable.

### 5.6 Project Management

- **Dashboard**: Grid/list view of projects, sorted by recent activity
  - Tabs: My Projects, Shared with Me, Archived, Trash
  - Search and filter
  - Storage usage indicator per project and total
- **Project operations**: Create, rename, clone, archive, delete
- **File manager**:
  - Tree view sidebar
  - Create/rename/delete files and folders
  - Upload files (images, .bib, .cls, .sty, etc.)
  - Drag-and-drop upload and reordering
  - Main document selection (.tex entry point)
  - Soft-delete with trash (recoverable until project version is garbage-collected)
- **Sharing**:
  - Invite by email with role (editor/viewer)
  - Shareable link with configurable permissions (tokens generated via `crypto.randomBytes(32).toString('hex')`)
  - Transfer ownership
- **Project settings**: Compiler selection, main document, spell check language

### 5.7 Version History

- Each project backed by a Git repository (isomorphic-git)
- Auto-save creates commits at regular intervals (configurable, default 5 minutes)
- Manual version labeling ("Draft 1", "Submitted to IEEE", etc.)
- Version list with timestamps and labels
- Diff view: side-by-side comparison between any two versions
- Restore: revert project to any previous version
- Per-file history view
- **Repository maintenance**: git gc runs weekly per project. Repository size limit: 500MB. Warning at 400MB, hard block at 500MB.

### 5.8 Git Integration

- Link project to external Git repository (GitHub, GitLab, Bitbucket)
- Push local changes to remote
- Pull remote changes into project
- Clone project from Git URL
- SSH key pair generation and management per user
- OAuth token storage (encrypted with AES-256-GCM) for HTTPS remotes
- Sync status indicator and conflict resolution UI

### 5.9 Template Gallery

- Curated academic templates:
  - Journal: IEEE, ACM, Springer, Elsevier, Nature
  - Thesis: various university formats
  - Presentation: Beamer themes
  - Letter, CV/Resume
- Template metadata: name, description, category, preview thumbnail
- One-click "Use Template" → creates new project from template
- User-submitted templates (moderated)
- Template search and category filtering

### 5.10 Admin Panel

- User management: list, search, suspend, delete users
- System metrics: active users, compilations/hour, storage usage
- Compilation worker status, warm pool size, queue depth
- Rate limit configuration
- Template moderation queue
- **Audit log**: All admin actions (suspend, role change, delete) logged with admin ID, target, action, timestamp

## 6. Database Schema

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    avatar_url TEXT,
    institution VARCHAR(255),
    bio TEXT,
    settings JSONB DEFAULT '{}',
    email_verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'user', -- user, admin
    storage_used_bytes BIGINT DEFAULT 0,
    storage_quota_bytes BIGINT DEFAULT 2147483648, -- 2GB default
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth Accounts (tokens encrypted at application level with AES-256-GCM)
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- google, github, orcid
    provider_account_id VARCHAR(255) NOT NULL,
    encrypted_access_token TEXT,
    encrypted_refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    UNIQUE(provider, provider_account_id)
);

-- Projects (owner derived from project_members where role='owner')
-- created_by is immutable provenance; ownership is mutable via project_members
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    compiler VARCHAR(20) DEFAULT 'pdflatex', -- pdflatex, xelatex, lualatex
    main_file VARCHAR(255) DEFAULT 'main.tex',
    is_public BOOLEAN DEFAULT FALSE,
    git_repo_path TEXT,
    archived BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Members (single source of truth for ownership)
CREATE TABLE project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- owner, editor, viewer
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

-- Files (metadata; actual content in MinIO; soft-delete supported)
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    path VARCHAR(1024) NOT NULL,
    is_binary BOOLEAN DEFAULT FALSE,
    size_bytes BIGINT DEFAULT 0,
    mime_type VARCHAR(255),
    minio_key TEXT,
    deleted_at TIMESTAMPTZ, -- soft delete
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    -- Note: uniqueness enforced via partial unique index below, not table-level UNIQUE
);

-- Compilations (retention: last 50 per project, older auto-purged)
CREATE TABLE compilations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL, -- queued, compiling, success, error, timeout
    compiler VARCHAR(20) NOT NULL,
    log TEXT,
    pdf_minio_key TEXT,
    synctex_minio_key TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version Labels
CREATE TABLE versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    label VARCHAR(255),
    git_hash VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- journal, thesis, presentation, letter, cv
    thumbnail_url TEXT,
    source_project_id UUID REFERENCES projects(id),
    author_id UUID REFERENCES users(id),
    is_approved BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Git Credentials (all tokens encrypted with AES-256-GCM)
CREATE TABLE git_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    encrypted_token TEXT,
    ssh_public_key TEXT,
    ssh_encrypted_private_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Share Links (token must be crypto.randomBytes(32).toString('hex'))
CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    permission VARCHAR(20) NOT NULL, -- editor, viewer
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- suspend_user, unsuspend_user, change_role, delete_user, approve_template
    target_type VARCHAR(50) NOT NULL, -- user, template, project
    target_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE UNIQUE INDEX idx_one_owner_per_project ON project_members(project_id) WHERE role = 'owner'; -- enforce exactly one owner
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE UNIQUE INDEX idx_files_unique_path ON files(project_id, path) WHERE deleted_at IS NULL; -- partial unique: allows re-creation after soft-delete
CREATE INDEX idx_compilations_project_id ON compilations(project_id);
CREATE INDEX idx_compilations_user_created ON compilations(user_id, created_at); -- for rate-limit queries
CREATE INDEX idx_compilations_project_created ON compilations(project_id, created_at DESC); -- for retention purge
CREATE INDEX idx_versions_project_id ON versions(project_id);
CREATE INDEX idx_templates_category ON templates(category) WHERE is_approved = TRUE;
-- Note: share_links.token UNIQUE constraint already creates an implicit index; no separate index needed
CREATE INDEX idx_audit_log_admin_id ON audit_log(admin_id);
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 7. API Endpoints (Key Routes)

All routes served by Next.js API routes under `/api/v1/*` (versioned for forward compatibility).

### CORS Policy
- Allowed origins: configurable via `CORS_ORIGINS` env var (comma-separated list)
- Development default: `http://localhost:3000`
- Production: set to the deployment domain(s)
- Credentials: `Access-Control-Allow-Credentials: true` (required for cookie-based auth)
- Methods: GET, POST, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization

### Authentication (NextAuth.js)
- `POST /api/v1/auth/register` — Email/password registration
- `POST /api/v1/auth/[...nextauth]` — NextAuth.js catch-all (login, OAuth, session, CSRF)
- `POST /api/v1/auth/forgot-password` — Request password reset (sends email)
- `POST /api/auth/reset-password` — Reset password with signed JWT token
- `GET /api/auth/verify-email/:token` — Verify email with signed JWT token

### Projects
- `GET /api/projects` — List user's projects
- `POST /api/projects` — Create project
- `GET /api/projects/:id` — Get project details
- `PATCH /api/projects/:id` — Update project settings
- `DELETE /api/projects/:id` — Soft-delete project
- `POST /api/projects/:id/clone` — Clone project
- `POST /api/projects/from-template/:templateId` — Create from template

### Files
- `GET /api/projects/:id/files` — List project files
- `GET /api/projects/:id/files/:path` — Get file content
- `PUT /api/projects/:id/files/:path` — Create/update file
- `DELETE /api/projects/:id/files/:path` — Soft-delete file
- `POST /api/projects/:id/files/upload` — Upload binary file

### Compilation
- `POST /api/projects/:id/compile` — Trigger compilation (returns compileId)
- `GET /api/projects/:id/compile/:compileId/status` — Get compilation status
- `GET /api/projects/:id/compile/:compileId/pdf` — Download compiled PDF
- `GET /api/projects/:id/compile/:compileId/synctex` — Get SyncTeX data
- (Compilation logs delivered via existing WebSocket connection, not SSE)

### Collaboration
- `GET /api/projects/:id/members` — List project members
- `POST /api/projects/:id/members` — Invite member (sends email)
- `PATCH /api/projects/:id/members/:userId` — Update member role
- `DELETE /api/projects/:id/members/:userId` — Remove member
- `POST /api/projects/:id/share-link` — Create share link
- `GET /api/join/:token` — Join via share link

### Version History
- `GET /api/projects/:id/versions` — List versions
- `POST /api/projects/:id/versions` — Create labeled version
- `GET /api/projects/:id/versions/:versionId/diff` — Get diff
- `POST /api/projects/:id/versions/:versionId/restore` — Restore version

### Git Integration
- `POST /api/projects/:id/git/link` — Link to remote repository
- `POST /api/projects/:id/git/push` — Push to remote
- `POST /api/projects/:id/git/pull` — Pull from remote
- `POST /api/projects/import-git` — Import from Git URL
- `GET /api/user/git-credentials` — List Git credentials
- `POST /api/user/git-credentials` — Add Git credential

### Templates
- `GET /api/templates` — List templates (with filtering)
- `GET /api/templates/:id` — Get template details
- `POST /api/templates` — Submit template
- `GET /api/admin/templates/pending` — Admin: pending templates

### Admin
- `GET /api/admin/users` — List users
- `PATCH /api/admin/users/:id` — Update user (suspend, role change) — writes audit log
- `GET /api/admin/stats` — System statistics
- `GET /api/admin/workers` — Compilation worker status + warm pool size
- `GET /api/admin/audit-log` — View audit log

## 8. WebSocket Protocol

### Connection
- URL: `wss://host/ws/:projectId`
- **Authentication**: On WebSocket upgrade, the server reads the JWT from the httpOnly cookie attached to the HTTP upgrade request (cookies are sent automatically on same-origin WebSocket connections). No query parameter token needed.
- **Authorization**: Server verifies the user's project membership and role:
  - `owner` / `editor`: full read/write (send + receive Yjs updates)
  - `viewer`: read-only (receive updates and awareness, but server silently drops any `update` messages from viewer clients)
  - No membership: connection rejected with 403
- Protocol: Yjs WebSocket sync protocol

### Horizontal Scaling
- Nginx routes WebSocket connections using sticky sessions based on `projectId` hash
- Cross-instance sync via y-redis: all WebSocket server instances subscribe to the same Redis pub/sub channels per project
- If a WebSocket server instance dies, clients reconnect (exponential backoff) and are routed to another instance; document state is restored from Redis

### Rate Limiting
- Maximum 100 Yjs update messages per second per client
- Maximum message size: 1MB
- Exceeding limits: warning message sent, then connection terminated on repeated violation

### Message Types
- `sync-step-1` / `sync-step-2`: Initial document sync
- `update`: Document changes (Yjs encoded)
- `awareness`: Cursor positions, user presence
- `compile-status`: Compilation progress notifications (log lines, completion)

## 9. Security

### Compilation Sandbox
- **Warm pool of nsjail sandboxes** (not fresh Docker containers per compilation)
  - nsjail provides process-level sandboxing with namespace isolation, cgroups, and seccomp
  - Pool of 5 pre-initialized sandboxes (configurable via env var)
  - Sandbox reset between uses (fresh /tmp, cleared environment)
  - New sandbox creation: ~50ms (vs 1-3s for Docker container)
- `--no-shell-escape` enforced (configurable per-instance for admin)
- Read-only bind mount of project files
- No network access inside sandbox
- Resource limits: 1 CPU core, 1GB RAM, 60s timeout
- **Throughput estimate**: With 5 warm sandboxes, ~5 concurrent compilations. At average 10s per compilation, ~30 compilations/minute per worker node. Scale worker nodes horizontally for more.

### Application Security
- JWT tokens in httpOnly, secure, sameSite=strict cookies
- CSRF protection on all state-changing endpoints (NextAuth.js built-in CSRF token)
- Rate limiting (Redis-backed): 100 req/min per user (API), 10 compilations/min per user
- Input validation with Zod on all endpoints
- SQL injection prevention via Prisma parameterized queries
- XSS prevention: React's built-in escaping + CSP headers
- File upload: type validation, 50MB size limit per file, 500MB per project, 2GB per user
- **Encryption**: All OAuth tokens and Git credentials encrypted with AES-256-GCM using server-side key (from env var / Kubernetes Secret). Key rotation supported: new key ID stored alongside ciphertext; on rotation, old keys remain for decryption, new key used for encryption. Background job re-encrypts existing records.
- Share link tokens: `crypto.randomBytes(32).toString('hex')` — 256-bit entropy, not enumerable

### Infrastructure Security
- Nginx SSL termination with modern TLS 1.3 config
- Internal services not exposed to public network (Docker internal network)
- Docker network isolation between services
- Secrets management via environment variables (production: Kubernetes Secrets)
- WebSocket connections authenticated via cookie + authorized per project role

## 10. Deployment

### Development (Docker Compose)
```yaml
# Single command: docker-compose up
# Services: app (Next.js), websocket, compilation-worker, postgres, pgbouncer, redis, minio, mailhog (dev SMTP), nginx
# Hot reload enabled for app and websocket
# MailHog UI at :8025 for testing emails locally
```

### Production (Kubernetes)
- Helm chart with configurable values
- Horizontal Pod Autoscaler for Next.js app and compilation workers
- WebSocket server: sticky session routing via Nginx ingress annotation
- Persistent volumes for PostgreSQL and MinIO
- PgBouncer sidecar for database connection pooling
- Ingress controller with cert-manager for SSL
- Prometheus ServiceMonitor + Grafana dashboards
- Health check endpoints on all services (`/healthz`, `/readyz`)

## 11. Monitoring & Observability

- **Metrics**: Prometheus exporters on all services
  - Compilation queue depth, success/failure rates, duration histograms, warm pool utilization
  - Active WebSocket connections, message rates, Yjs document count
  - API request latency, error rates
  - Storage usage per user/project, quota utilization
  - Database connection pool usage (PgBouncer stats)
- **Dashboards**: Grafana with pre-built dashboards
- **Logging**: Structured JSON logs, aggregated via Loki or ELK
- **Alerting**: Prometheus Alertmanager for critical conditions (queue depth > threshold, worker pool exhausted, storage > 80%)

## 12. Data Retention & Maintenance

- **Compilations**: Retain last 50 compilations per project. Older records purged by daily cron job. Associated PDFs in MinIO also deleted.
- **Soft-deleted projects**: Permanently purged after 30 days (files, Git repo, MinIO objects).
- **Soft-deleted files**: Recoverable until next Git gc or project purge.
- **Git repositories**: `git gc` runs weekly per project. Max repo size: 500MB.
- **Audit log**: Retained for 1 year, then archived to cold storage.

## 13. Backup & Disaster Recovery

- **PostgreSQL**: Daily pg_dump to MinIO backup bucket, retained for 30 days. WAL archiving for point-in-time recovery.
- **MinIO**: Bucket replication to secondary storage (configurable: another MinIO instance, or S3). Daily integrity check.
- **Redis**: AOF persistence enabled. Snapshot every 2 minutes. Redis Sentinel/Cluster recommended for production (Yjs durability). Full Redis data loss recoverable from PostgreSQL + MinIO (max 2 minutes of Yjs edits lost).
- **Recovery targets**: RPO (Recovery Point Objective) < 1 hour, RTO (Recovery Time Objective) < 4 hours.
- **Runbook**: Documented recovery procedures for each service failure scenario.

## 14. Future Enhancements (Post-MVP)

- Rich text / WYSIWYG mode toggle
- Spell check and grammar check integration
- Bibliography manager (BibTeX GUI)
- Presentation mode (Beamer slide preview)
- Mobile-responsive editor
- Plugin/extension system
- AI-assisted writing (autocomplete, suggestions)
- Institutional SSO (SAML, LDAP)
