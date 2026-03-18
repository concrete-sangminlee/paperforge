# PaperForge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build PaperForge, a self-hostable Overleaf alternative with real-time collaborative LaTeX editing, instant compilation, and Git integration.

**Architecture:** Monorepo with Next.js 14 (frontend + API), separate WebSocket server (Yjs), and compilation worker (BullMQ + nsjail). PostgreSQL for persistence, Redis for cache/queue/Yjs sync, MinIO for file storage. All services orchestrated via Docker Compose.

**Tech Stack:** Next.js 14, TypeScript, CodeMirror 6, Yjs, TailwindCSS, shadcn/ui, Prisma, PostgreSQL, Redis, BullMQ, MinIO, PDF.js, nsjail, Docker

**Spec:** `docs/superpowers/specs/2026-03-18-paperforge-design.md`

---

## File Structure

```
paperforge/
├── docker-compose.yml              # Dev orchestration (all services)
├── docker-compose.prod.yml         # Production overrides
├── .env.example                    # Environment template
├── nginx/
│   └── nginx.conf                  # Reverse proxy config
├── nsjail/
│   └── latex.cfg                   # nsjail sandbox config for TeX Live
├── texlive/
│   └── Dockerfile                  # Custom TeX Live image (~2GB)
│
├── package.json                    # Root: Next.js app
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── seed.ts                     # Template seeding
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (providers, navbar)
│   │   ├── page.tsx                # Landing page → redirect to dashboard
│   │   ├── globals.css             # Tailwind base styles
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Dashboard shell (sidebar, navbar)
│   │   │   ├── projects/page.tsx   # Project list
│   │   │   └── settings/page.tsx   # User settings
│   │   ├── editor/[projectId]/
│   │   │   └── page.tsx            # Main editor view
│   │   ├── join/[token]/
│   │   │   └── page.tsx            # Share link join
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # Admin dashboard / stats
│   │   │   ├── users/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   ├── workers/page.tsx
│   │   │   └── audit-log/page.tsx
│   │   └── api/v1/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts
│   │       │   ├── register/route.ts
│   │       │   ├── forgot-password/route.ts
│   │       │   ├── reset-password/route.ts
│   │       │   └── verify-email/[token]/route.ts
│   │       ├── projects/
│   │       │   ├── route.ts                        # GET list, POST create
│   │       │   ├── from-template/[templateId]/route.ts
│   │       │   ├── import-git/route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts                    # GET, PATCH, DELETE
│   │       │       ├── clone/route.ts
│   │       │       ├── files/
│   │       │       │   ├── route.ts                # GET list
│   │       │       │   ├── [...path]/route.ts      # GET/PUT/DELETE file
│   │       │       │   └── upload/route.ts
│   │       │       ├── compile/
│   │       │       │   ├── route.ts                # POST trigger
│   │       │       │   └── [compileId]/
│   │       │       │       ├── status/route.ts
│   │       │       │       ├── pdf/route.ts
│   │       │       │       └── synctex/route.ts
│   │       │       ├── members/
│   │       │       │   ├── route.ts                # GET, POST
│   │       │       │   └── [userId]/route.ts       # PATCH, DELETE
│   │       │       ├── share-link/route.ts
│   │       │       ├── versions/
│   │       │       │   ├── route.ts                # GET, POST
│   │       │       │   └── [versionId]/
│   │       │       │       ├── diff/route.ts
│   │       │       │       └── restore/route.ts
│   │       │       └── git/
│   │       │           ├── link/route.ts
│   │       │           ├── push/route.ts
│   │       │           └── pull/route.ts
│   │       ├── join/[token]/route.ts
│   │       ├── templates/
│   │       │   ├── route.ts                        # GET, POST
│   │       │   └── [id]/route.ts
│   │       ├── user/
│   │       │   └── git-credentials/route.ts
│   │       └── admin/
│   │           ├── users/
│   │           │   ├── route.ts
│   │           │   └── [id]/route.ts
│   │           ├── stats/route.ts
│   │           ├── workers/route.ts
│   │           ├── templates/pending/route.ts
│   │           └── audit-log/route.ts
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components (button, input, dialog, etc.)
│   │   ├── editor/
│   │   │   ├── latex-editor.tsx    # CodeMirror 6 wrapper
│   │   │   ├── editor-toolbar.tsx  # Compile button, settings
│   │   │   ├── file-tree.tsx       # Project file sidebar
│   │   │   ├── pdf-viewer.tsx      # PDF.js viewer with SyncTeX
│   │   │   ├── compilation-log.tsx # Compilation output panel
│   │   │   ├── collaborators.tsx   # Online users, cursors
│   │   │   └── editor-layout.tsx   # Split pane layout
│   │   ├── dashboard/
│   │   │   ├── project-card.tsx
│   │   │   ├── project-grid.tsx
│   │   │   ├── create-project-dialog.tsx
│   │   │   ├── share-dialog.tsx
│   │   │   └── storage-bar.tsx
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   └── oauth-buttons.tsx
│   │   ├── admin/
│   │   │   ├── user-table.tsx
│   │   │   ├── stats-cards.tsx
│   │   │   └── worker-status.tsx
│   │   └── shared/
│   │       ├── navbar.tsx
│   │       ├── sidebar.tsx
│   │       └── loading.tsx
│   ├── lib/
│   │   ├── prisma.ts               # Prisma client singleton
│   │   ├── redis.ts                # Redis client singleton
│   │   ├── minio.ts                # MinIO client singleton
│   │   ├── auth.ts                 # NextAuth.js configuration
│   │   ├── email.ts                # Nodemailer transport
│   │   ├── encryption.ts           # AES-256-GCM encrypt/decrypt
│   │   ├── jwt-utils.ts            # Custom JWT helpers (email verify, password reset)
│   │   ├── rate-limit.ts           # Redis-based rate limiter
│   │   ├── cors.ts                 # CORS middleware
│   │   ├── validation.ts           # Zod schemas
│   │   └── errors.ts               # API error handling
│   ├── services/
│   │   ├── project-service.ts      # Project CRUD + membership
│   │   ├── file-service.ts         # File CRUD + MinIO operations
│   │   ├── compilation-service.ts  # BullMQ job management
│   │   ├── version-service.ts      # Git operations for version history
│   │   ├── git-service.ts          # External Git push/pull
│   │   ├── template-service.ts     # Template CRUD
│   │   ├── user-service.ts         # User management + quotas
│   │   └── audit-service.ts        # Admin audit logging
│   ├── store/
│   │   ├── editor-store.ts         # Zustand: editor state (open files, active tab)
│   │   └── project-store.ts        # Zustand: current project context
│   └── types/
│       └── index.ts                # Shared TypeScript types
│
├── websocket/                      # Separate WebSocket server
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── src/
│       ├── index.ts                # Entry point, HTTP upgrade handler
│       ├── auth.ts                 # JWT verification from cookie
│       ├── authorization.ts        # Project role checks
│       ├── yjs-server.ts           # Yjs document management + y-redis
│       ├── rate-limiter.ts         # Per-client message rate limiting
│       └── flush.ts                # Periodic Yjs → MinIO flush
│
├── worker/                         # Compilation worker
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── src/
│       ├── index.ts                # Entry point, BullMQ worker
│       ├── compiler.ts             # LaTeX compilation logic
│       ├── sandbox.ts              # nsjail wrapper
│       ├── warm-pool.ts            # Pre-started sandbox pool management
│       └── synctex-parser.ts       # Parse .synctex.gz for frontend
│
└── tests/
    ├── setup.ts                    # Test database + mocks
    ├── lib/
    │   ├── encryption.test.ts
    │   ├── rate-limit.test.ts
    │   └── jwt-utils.test.ts
    ├── services/
    │   ├── project-service.test.ts
    │   ├── file-service.test.ts
    │   ├── compilation-service.test.ts
    │   ├── user-service.test.ts
    │   └── version-service.test.ts
    ├── api/
    │   ├── auth.test.ts
    │   ├── projects.test.ts
    │   ├── files.test.ts
    │   ├── compile.test.ts
    │   └── members.test.ts
    ├── components/
    │   ├── login-form.test.tsx
    │   ├── project-grid.test.tsx
    │   └── latex-editor.test.tsx
    └── e2e/
        ├── auth.spec.ts
        ├── editor.spec.ts
        └── collaboration.spec.ts
```

---

## Chunk 1: Infrastructure + Database + Authentication

This chunk sets up the entire foundation: Docker services, database schema, authentication, and the first working pages (login, register, dashboard shell). Everything else builds on this.

### Task 1: Initialize Next.js Project + Docker Compose

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `nginx/nginx.conf`

- [ ] **Step 1: Create Next.js project**

```bash
cd C:/Users/HpSE/project_latexcompiler
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbo
```

Accept defaults. This scaffolds the Next.js project.

- [ ] **Step 2: Install core dependencies**

```bash
npm install @prisma/client next-auth@5 zod zustand swr bcryptjs nodemailer ioredis minio bullmq uuid
npm install -D prisma @types/bcryptjs @types/nodemailer @types/uuid vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input label card dialog dropdown-menu avatar badge separator tabs toast sheet scroll-area command popover select textarea
```

- [ ] **Step 4: Create `.env.example`**

```env
# Database
DATABASE_URL=postgresql://paperforge:paperforge@localhost:5432/paperforge?connection_limit=5

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=paperforge
MINIO_SECRET_KEY=paperforge123
MINIO_BUCKET=paperforge

# Auth
NEXTAUTH_SECRET=change-me-to-random-secret-at-least-32-chars
NEXTAUTH_URL=http://localhost:3000

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@paperforge.dev

# Encryption
ENCRYPTION_KEY=change-me-to-64-hex-chars-representing-32-bytes

# App
NEXT_PUBLIC_APP_NAME=PaperForge
NEXT_PUBLIC_WS_URL=ws://localhost:4001
```

- [ ] **Step 5: Create `docker-compose.yml`**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: paperforge
      POSTGRES_PASSWORD: paperforge
      POSTGRES_DB: paperforge
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U paperforge"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --save 120 1
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: paperforge
      MINIO_ROOT_PASSWORD: paperforge123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 3s
      retries: 5

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

- [ ] **Step 6: Create `.gitignore`**

Add `node_modules/`, `.next/`, `.env`, `.env.local`, `*.log` to `.gitignore`.

- [ ] **Step 7: Start Docker services and verify**

```bash
docker-compose up -d
# Verify: docker-compose ps (all healthy)
# Verify: curl http://localhost:9001 (MinIO console)
# Verify: open http://localhost:8025 (MailHog UI)
```

- [ ] **Step 8: Verify Next.js dev server**

```bash
cp .env.example .env.local
npm run dev
# Verify: open http://localhost:3000 (Next.js default page)
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with Docker Compose infrastructure"
```

---

### Task 2: Prisma Schema + Database Migration

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: Create Prisma schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                 String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email              String    @unique @db.VarChar(255)
  name               String    @db.VarChar(255)
  passwordHash       String?   @map("password_hash") @db.VarChar(255)
  avatarUrl          String?   @map("avatar_url")
  institution        String?   @db.VarChar(255)
  bio                String?
  settings           Json      @default("{}")
  emailVerified      Boolean   @default(false) @map("email_verified")
  role               String    @default("user") @db.VarChar(20)
  storageUsedBytes   BigInt    @default(0) @map("storage_used_bytes")
  storageQuotaBytes  BigInt    @default(2147483648) @map("storage_quota_bytes")
  failedLoginAttempts Int      @default(0) @map("failed_login_attempts")
  lockedUntil        DateTime? @map("locked_until") @db.Timestamptz()
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt          DateTime  @updatedAt @map("updated_at") @db.Timestamptz()

  oauthAccounts   OAuthAccount[]
  projectMembers  ProjectMember[]
  compilations    Compilation[]
  versions        Version[]
  templates       Template[]       @relation("TemplateAuthor")
  gitCredentials  GitCredential[]
  auditLogs       AuditLog[]
  createdProjects Project[]        @relation("ProjectCreator")

  @@map("users")
}

model OAuthAccount {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                String    @map("user_id") @db.Uuid
  provider              String    @db.VarChar(50)
  providerAccountId     String    @map("provider_account_id") @db.VarChar(255)
  encryptedAccessToken  String?   @map("encrypted_access_token")
  encryptedRefreshToken String?   @map("encrypted_refresh_token")
  expiresAt             DateTime? @map("expires_at") @db.Timestamptz()

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("oauth_accounts")
}

model Project {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  createdBy   String?   @map("created_by") @db.Uuid
  name        String    @db.VarChar(255)
  description String?
  compiler    String    @default("pdflatex") @db.VarChar(20)
  mainFile    String    @default("main.tex") @map("main_file") @db.VarChar(255)
  isPublic    Boolean   @default(false) @map("is_public")
  gitRepoPath String?   @map("git_repo_path")
  archived    Boolean   @default(false)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz()
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz()

  creator      User?           @relation("ProjectCreator", fields: [createdBy], references: [id])
  members      ProjectMember[]
  files        File[]
  compilations Compilation[]
  versions     Version[]
  shareLinks   ShareLink[]
  templateSource Template?     @relation("TemplateSource")

  @@index([deletedAt])
  @@map("projects")
}

model ProjectMember {
  projectId String   @map("project_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  role      String   @db.VarChar(20) // owner, editor, viewer
  joinedAt  DateTime @default(now()) @map("joined_at") @db.Timestamptz()

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([projectId, userId])
  @@index([userId])
  @@index([projectId])
  @@map("project_members")
}

model File {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId String    @map("project_id") @db.Uuid
  path      String    @db.VarChar(1024)
  isBinary  Boolean   @default(false) @map("is_binary")
  sizeBytes BigInt    @default(0) @map("size_bytes")
  mimeType  String?   @map("mime_type") @db.VarChar(255)
  minioKey  String?   @map("minio_key")
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz()
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz()

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Note: partial unique index created via manual migration (see Task 2, Step 4)
  // CREATE UNIQUE INDEX idx_files_unique_path ON files(project_id, path) WHERE deleted_at IS NULL;
  @@index([projectId])
  @@index([projectId, path])
  @@map("files")
}

model Compilation {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId      String   @map("project_id") @db.Uuid
  userId         String?  @map("user_id") @db.Uuid
  status         String   @db.VarChar(20) // queued, compiling, success, error, timeout
  compiler       String   @db.VarChar(20)
  log            String?
  pdfMinioKey    String?  @map("pdf_minio_key")
  synctexMinioKey String? @map("synctex_minio_key")
  durationMs     Int?     @map("duration_ms")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz()

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User?   @relation(fields: [userId], references: [id])

  @@index([projectId])
  @@index([userId, createdAt])
  @@index([projectId, createdAt(sort: Desc)])
  @@map("compilations")
}

model Version {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId String   @map("project_id") @db.Uuid
  userId    String?  @map("user_id") @db.Uuid
  label     String?  @db.VarChar(255)
  gitHash   String   @map("git_hash") @db.VarChar(40)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz()

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User?   @relation(fields: [userId], references: [id])

  @@index([projectId])
  @@map("versions")
}

model Template {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name            String   @db.VarChar(255)
  description     String?
  category        String?  @db.VarChar(50)
  thumbnailUrl    String?  @map("thumbnail_url")
  sourceProjectId String?  @unique @map("source_project_id") @db.Uuid
  authorId        String?  @map("author_id") @db.Uuid
  isApproved      Boolean  @default(false) @map("is_approved")
  downloadCount   Int      @default(0) @map("download_count")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz()

  sourceProject Project? @relation("TemplateSource", fields: [sourceProjectId], references: [id])
  author        User?    @relation("TemplateAuthor", fields: [authorId], references: [id])

  @@index([category])
  @@map("templates")
}

model GitCredential {
  id                     String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                 String   @map("user_id") @db.Uuid
  provider               String   @db.VarChar(50)
  encryptedToken         String?  @map("encrypted_token")
  sshPublicKey           String?  @map("ssh_public_key")
  sshEncryptedPrivateKey String?  @map("ssh_encrypted_private_key")
  createdAt              DateTime @default(now()) @map("created_at") @db.Timestamptz()

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("git_credentials")
}

model ShareLink {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId  String    @map("project_id") @db.Uuid
  token      String    @unique @db.VarChar(64)
  permission String    @db.VarChar(20) // editor, viewer
  expiresAt  DateTime? @map("expires_at") @db.Timestamptz()
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("share_links")
}

model AuditLog {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  adminId    String   @map("admin_id") @db.Uuid
  action     String   @db.VarChar(50)
  targetType String   @map("target_type") @db.VarChar(50)
  targetId   String   @map("target_id") @db.Uuid
  details    Json?
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz()

  admin User @relation(fields: [adminId], references: [id])

  @@index([adminId])
  @@index([targetType, targetId])
  @@map("audit_log")
}
```

- [ ] **Step 2: Create Prisma client singleton**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration created, tables visible in PostgreSQL.

- [ ] **Step 4: Add the one-owner-per-project partial unique index**

Prisma doesn't support partial unique indexes natively. Create a manual migration:

```bash
npx prisma migrate dev --name add_one_owner_constraint --create-only
```

Then edit the generated SQL file to add:

```sql
CREATE UNIQUE INDEX idx_one_owner_per_project ON project_members(project_id) WHERE role = 'owner';
CREATE UNIQUE INDEX idx_files_unique_path ON files(project_id, path) WHERE deleted_at IS NULL;
```

Run:

```bash
npx prisma migrate dev
```

- [ ] **Step 5: Verify with Prisma Studio**

```bash
npx prisma studio
# Opens browser at localhost:5555 — verify all tables exist
```

- [ ] **Step 6: Commit**

```bash
git add prisma/ src/lib/prisma.ts
git commit -m "feat: add Prisma schema and initial database migration"
```

---

### Task 3: Core Library Files (Redis, MinIO, Encryption, Email)

**Files:**
- Create: `src/lib/redis.ts`
- Create: `src/lib/minio.ts`
- Create: `src/lib/encryption.ts`
- Create: `src/lib/email.ts`
- Create: `src/lib/jwt-utils.ts`
- Create: `src/lib/rate-limit.ts`
- Create: `src/lib/errors.ts`
- Create: `src/lib/validation.ts`
- Test: `tests/lib/encryption.test.ts`
- Test: `tests/lib/jwt-utils.test.ts`
- Test: `tests/lib/rate-limit.test.ts`

- [ ] **Step 1: Write encryption tests**

```typescript
// tests/lib/encryption.test.ts
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '@/lib/encryption';

describe('encryption', () => {
  it('encrypts and decrypts a string', () => {
    const plaintext = 'my-secret-token';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(':'); // iv:ciphertext:tag format
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext for same input (random IV)', () => {
    const plaintext = 'my-secret-token';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('test');
    const tampered = encrypted.slice(0, -2) + 'xx';
    expect(() => decrypt(tampered)).toThrow();
  });
});
```

- [ ] **Step 2: Run test — should fail**

```bash
npx vitest run tests/lib/encryption.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

```typescript
// tests/setup.ts
// Set test environment variables
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex
process.env.NEXTAUTH_SECRET = 'test-secret-at-least-32-characters-long';
process.env.SMTP_FROM = 'test@paperforge.dev';
```

- [ ] **Step 4: Implement encryption**

```typescript
// src/lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivHex, encHex, tagHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
```

- [ ] **Step 5: Run encryption tests — should pass**

```bash
npx vitest run tests/lib/encryption.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 6: Write JWT utils tests**

```typescript
// tests/lib/jwt-utils.test.ts
import { describe, it, expect } from 'vitest';
import { createSignedToken, verifySignedToken } from '@/lib/jwt-utils';

describe('jwt-utils', () => {
  it('creates and verifies a token', () => {
    const token = createSignedToken({ userId: '123', purpose: 'email-verify' }, '1h');
    const payload = verifySignedToken(token);
    expect(payload.userId).toBe('123');
    expect(payload.purpose).toBe('email-verify');
  });

  it('rejects tampered tokens', () => {
    const token = createSignedToken({ userId: '123' }, '1h');
    const tampered = token.slice(0, -2) + 'xx';
    expect(() => verifySignedToken(tampered)).toThrow();
  });

  it('rejects expired tokens', () => {
    const token = createSignedToken({ userId: '123' }, '0s');
    // Token expires immediately
    expect(() => verifySignedToken(token)).toThrow();
  });
});
```

- [ ] **Step 7: Implement JWT utils**

```typescript
// src/lib/jwt-utils.ts
import jwt from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET not set');
  return secret;
}

export function createSignedToken(payload: Record<string, unknown>, expiresIn: string): string {
  return jwt.sign(payload, getSecret(), { expiresIn });
}

export function verifySignedToken(token: string): Record<string, unknown> {
  return jwt.verify(token, getSecret()) as Record<string, unknown>;
}
```

Note: install jsonwebtoken: `npm install jsonwebtoken && npm install -D @types/jsonwebtoken`

- [ ] **Step 8: Run JWT tests — should pass**

```bash
npx vitest run tests/lib/jwt-utils.test.ts
```

- [ ] **Step 9: Create remaining lib files (no TDD needed — thin wrappers)**

```typescript
// src/lib/redis.ts
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis = globalForRedis.redis || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
```

```typescript
// src/lib/minio.ts
import { Client } from 'minio';

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'paperforge',
  secretKey: process.env.MINIO_SECRET_KEY || 'paperforge123',
});

const BUCKET = process.env.MINIO_BUCKET || 'paperforge';

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) await minioClient.makeBucket(BUCKET);
}

export function getBucket() {
  return BUCKET;
}
```

```typescript
// src/lib/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@paperforge.dev',
    to,
    subject,
    html,
  });
}
```

```typescript
// src/lib/rate-limit.ts
import { redis } from './redis';

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowKey = `ratelimit:${key}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(windowKey, 0, now - windowMs);
  pipeline.zadd(windowKey, now.toString(), `${now}-${Math.random()}`);
  pipeline.zcard(windowKey);
  pipeline.pexpire(windowKey, windowMs);

  const results = await pipeline.exec();
  const count = (results?.[2]?.[1] as number) || 0;

  if (count > limit) {
    return { allowed: false, remaining: 0, retryAfter: windowSeconds };
  }
  return { allowed: true, remaining: limit - count };
}
```

```typescript
// src/lib/errors.ts
import { NextResponse } from 'next/server';

import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
  }
  console.error('Unexpected error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

```typescript
// src/lib/validation.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain digit'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  compiler: z.enum(['pdflatex', 'xelatex', 'lualatex']).default('pdflatex'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  compiler: z.enum(['pdflatex', 'xelatex', 'lualatex']).optional(),
  mainFile: z.string().optional(),
  archived: z.boolean().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']),
});
```

- [ ] **Step 10: Write and run rate-limit test**

```typescript
// tests/lib/rate-limit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';
import { redis } from '@/lib/redis';

describe('rate-limit', () => {
  beforeEach(async () => {
    // Clean up test keys
    const keys = await redis.keys('ratelimit:test-*');
    if (keys.length > 0) await redis.del(...keys);
  });

  it('allows requests within limit', async () => {
    const result = await checkRateLimit('test-allow', 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks requests over limit', async () => {
    for (let i = 0; i < 3; i++) {
      await checkRateLimit('test-block', 3, 60);
    }
    const result = await checkRateLimit('test-block', 3, 60);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(60);
  });
});
```

```bash
npx vitest run tests/lib/rate-limit.test.ts
```

Expected: PASS (requires Redis running via Docker Compose).

- [ ] **Step 11: Commit**

```bash
git add src/lib/ tests/ vitest.config.ts
git commit -m "feat: add core libraries (encryption, JWT, Redis, MinIO, email, rate-limit)"
```

---

### Task 4: NextAuth.js Authentication

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/v1/auth/[...nextauth]/route.ts`
- Create: `src/app/api/v1/auth/register/route.ts`
- Create: `src/app/api/v1/auth/forgot-password/route.ts`
- Create: `src/app/api/v1/auth/reset-password/route.ts`
- Create: `src/app/api/v1/auth/verify-email/[token]/route.ts`
- Create: `src/services/user-service.ts`
- Test: `tests/api/auth.test.ts`

- [ ] **Step 1: Write auth integration tests**

```typescript
// tests/api/auth.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';

// Test the register API directly
describe('POST /api/v1/auth/register', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
  });

  it('registers a new user', async () => {
    const res = await fetch('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        password: 'TestPass1',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.email).toBe('test@example.com');
  });

  it('rejects duplicate email', async () => {
    const res = await fetch('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User 2',
        password: 'TestPass1',
      }),
    });
    expect(res.status).toBe(409);
  });

  it('rejects weak password', async () => {
    const res = await fetch('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        name: 'New User',
        password: 'weak',
      }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Create user service**

```typescript
// src/services/user-service.ts
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { ApiError } from '@/lib/errors';

export async function createUser(email: string, name: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return null;

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ApiError(423, 'Account temporarily locked. Try again later or reset password.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    // Increment failed attempts
    const attempts = user.failedLoginAttempts + 1;
    const update: Record<string, unknown> = { failedLoginAttempts: attempts };
    if (attempts >= 20) {
      update.lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    }
    await prisma.user.update({ where: { id: user.id }, data: update });
    return null;
  }

  // Reset failed attempts on success
  if (user.failedLoginAttempts > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
```

- [ ] **Step 3: Create NextAuth config**

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { verifyCredentials } from '@/services/user-service';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return verifyCredentials(
          credentials.email as string,
          credentials.password as string
        );
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID ? [GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })] : []),
    ...(process.env.GITHUB_CLIENT_ID ? [GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    })] : []),
  ],
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 }, // 7 days
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
});
```

- [ ] **Step 4: Create API routes**

```typescript
// src/app/api/v1/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

```typescript
// src/app/api/v1/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validation';
import { createUser } from '@/services/user-service';
import { createSignedToken } from '@/lib/jwt-utils';
import { sendEmail } from '@/lib/email';
import { errorResponse } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, password } = registerSchema.parse(body);
    const user = await createUser(email, name, password);

    // Send verification email
    const token = createSignedToken({ userId: user.id, purpose: 'email-verify' }, '24h');
    const verifyUrl = `${process.env.NEXTAUTH_URL}/api/v1/auth/verify-email/${token}`;
    await sendEmail(email, 'Verify your PaperForge account', `
      <h1>Welcome to PaperForge!</h1>
      <p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>
    `);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
```

```typescript
// src/app/api/v1/auth/verify-email/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySignedToken } from '@/lib/jwt-utils';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const payload = verifySignedToken(token);
    if (payload.purpose !== 'email-verify') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: payload.userId as string },
      data: { emailVerified: true },
    });
    return NextResponse.redirect(new URL('/login?verified=true', process.env.NEXTAUTH_URL));
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }
}
```

```typescript
// src/app/api/v1/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSignedToken } from '@/lib/jwt-utils';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return 200 to prevent email enumeration
  if (user) {
    const token = createSignedToken({ userId: user.id, purpose: 'password-reset' }, '1h');
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
    await sendEmail(email, 'Reset your PaperForge password', `
      <h1>Password Reset</h1>
      <p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>
    `);
  }

  return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
}
```

```typescript
// src/app/api/v1/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySignedToken } from '@/lib/jwt-utils';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const schema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
});

export async function POST(req: NextRequest) {
  try {
    const { token, password } = schema.parse(await req.json());
    const payload = verifySignedToken(token);
    if (payload.purpose !== 'password-reset') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: payload.userId as string },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });
    return NextResponse.json({ message: 'Password reset successfully' });
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }
}
```

- [ ] **Step 5: Run auth tests (requires dev server running)**

```bash
# In another terminal: npm run dev
npx vitest run tests/api/auth.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/api/v1/auth/ src/services/user-service.ts tests/api/auth.test.ts
git commit -m "feat: add authentication (NextAuth.js, register, verify email, password reset)"
```

---

### Task 5: Auth UI Pages (Login, Register, Forgot Password)

**Files:**
- Create: `src/components/auth/login-form.tsx`
- Create: `src/components/auth/register-form.tsx`
- Create: `src/components/auth/oauth-buttons.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`
- Create: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Create auth layout**

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">PaperForge</h1>
          <p className="text-gray-500 mt-2">LaTeX editing, reimagined</p>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create OAuth buttons component**

```tsx
// src/components/auth/oauth-buttons.tsx
'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function OAuthButtons() {
  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl: '/projects' })}>
        Continue with Google
      </Button>
      <Button variant="outline" className="w-full" onClick={() => signIn('github', { callbackUrl: '/projects' })}>
        Continue with GitHub
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create login form**

```tsx
// src/components/auth/login-form.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/projects');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          <div className="text-sm text-center space-y-1">
            <a href="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</a>
            <p>Don&apos;t have an account? <a href="/register" className="text-blue-600 hover:underline">Sign up</a></p>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Create register form**

```tsx
// src/components/auth/register-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Registration failed');
    } else {
      router.push('/login?registered=true');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <p className="text-xs text-gray-500">Min 8 chars, 1 uppercase, 1 lowercase, 1 digit</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
          <p className="text-sm text-center">
            Already have an account? <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 5: Create page files**

```tsx
// src/app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/login-form';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  return (
    <div className="space-y-4">
      <LoginForm />
      <div className="flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-sm text-gray-400">or</span>
        <Separator className="flex-1" />
      </div>
      <OAuthButtons />
    </div>
  );
}
```

```tsx
// src/app/(auth)/register/page.tsx
import { RegisterForm } from '@/components/auth/register-form';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { Separator } from '@/components/ui/separator';

export default function RegisterPage() {
  return (
    <div className="space-y-4">
      <RegisterForm />
      <div className="flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-sm text-gray-400">or</span>
        <Separator className="flex-1" />
      </div>
      <OAuthButtons />
    </div>
  );
}
```

```tsx
// src/app/(auth)/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p>If that email exists, a reset link has been sent. Check your inbox.</p>
          <a href="/login" className="text-blue-600 hover:underline mt-4 inline-block">Back to login</a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Forgot Password</CardTitle></CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">Send Reset Link</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 6: Add NextAuth SessionProvider to root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import './globals.css';

export const metadata: Metadata = {
  title: 'PaperForge',
  description: 'LaTeX editing, reimagined',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Verify in browser**

```bash
npm run dev
# Visit http://localhost:3000/login — should see login form
# Visit http://localhost:3000/register — should see register form
# Register a user → check MailHog at http://localhost:8025 for verification email
```

- [ ] **Step 8: Commit**

```bash
git add src/app/ src/components/auth/
git commit -m "feat: add auth UI (login, register, forgot password pages)"
```

---

### Task 6: Dashboard Shell + Project CRUD API

**Files:**
- Create: `src/services/project-service.ts`
- Create: `src/app/api/v1/projects/route.ts`
- Create: `src/app/api/v1/projects/[id]/route.ts`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/projects/page.tsx`
- Create: `src/components/shared/navbar.tsx`
- Create: `src/components/dashboard/project-card.tsx`
- Create: `src/components/dashboard/project-grid.tsx`
- Create: `src/components/dashboard/create-project-dialog.tsx`
- Create: `src/components/dashboard/storage-bar.tsx`
- Test: `tests/services/project-service.test.ts`

- [ ] **Step 1: Write project service tests**

```typescript
// tests/services/project-service.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createProject, listProjects, getProject, deleteProject } from '@/services/project-service';

let testUserId: string;

describe('project-service', () => {
  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where: { email: 'projecttest@example.com' },
      update: {},
      create: { email: 'projecttest@example.com', name: 'Test', passwordHash: 'x' },
    });
    testUserId = user.id;
  });

  it('creates a project with owner membership', async () => {
    const project = await createProject(testUserId, { name: 'Test Project' });
    expect(project.name).toBe('Test Project');
    const member = await prisma.projectMember.findFirst({
      where: { projectId: project.id, userId: testUserId },
    });
    expect(member?.role).toBe('owner');
  });

  it('lists projects for user', async () => {
    const projects = await listProjects(testUserId);
    expect(projects.length).toBeGreaterThan(0);
  });

  it('soft-deletes a project', async () => {
    const project = await createProject(testUserId, { name: 'To Delete' });
    await deleteProject(project.id, testUserId);
    const deleted = await prisma.project.findUnique({ where: { id: project.id } });
    expect(deleted?.deletedAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test — should fail**

```bash
npx vitest run tests/services/project-service.test.ts
```

- [ ] **Step 3: Implement project service**

```typescript
// src/services/project-service.ts
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';

export async function createProject(
  userId: string,
  data: { name: string; description?: string; compiler?: string }
) {
  const project = await prisma.project.create({
    data: {
      createdBy: userId,
      name: data.name,
      description: data.description,
      compiler: data.compiler || 'pdflatex',
      members: {
        create: { userId, role: 'owner' },
      },
    },
  });
  return project;
}

export async function listProjects(userId: string) {
  return prisma.project.findMany({
    where: {
      deletedAt: null,
      members: { some: { userId } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      _count: { select: { files: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      members: { some: { userId } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      files: { where: { deletedAt: null }, orderBy: { path: 'asc' } },
    },
  });
  if (!project) throw new ApiError(404, 'Project not found');
  return project;
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: { name?: string; description?: string; compiler?: string; mainFile?: string; archived?: boolean }
) {
  await assertProjectRole(projectId, userId, ['owner', 'editor']);
  return prisma.project.update({ where: { id: projectId }, data });
}

export async function deleteProject(projectId: string, userId: string) {
  await assertProjectRole(projectId, userId, ['owner']);
  return prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  });
}

export async function assertProjectRole(projectId: string, userId: string, roles: string[]) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member || !roles.includes(member.role)) {
    throw new ApiError(403, 'Insufficient permissions');
  }
  return member;
}
```

- [ ] **Step 4: Run tests — should pass**

```bash
npx vitest run tests/services/project-service.test.ts
```

- [ ] **Step 5: Create project API routes**

```typescript
// src/app/api/v1/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createProject, listProjects } from '@/services/project-service';
import { createProjectSchema } from '@/lib/validation';
import { errorResponse, ApiError } from '@/lib/errors';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const projects = await listProjects((session.user as { id: string }).id);
    return NextResponse.json({ projects });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const body = await req.json();
    const data = createProjectSchema.parse(body);
    const project = await createProject((session.user as { id: string }).id, data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
```

```typescript
// src/app/api/v1/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, updateProject, deleteProject } from '@/services/project-service';
import { updateProjectSchema } from '@/lib/validation';
import { errorResponse, ApiError } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const { id } = await params;
    const project = await getProject(id, (session.user as { id: string }).id);
    return NextResponse.json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const { id } = await params;
    const body = await req.json();
    const data = updateProjectSchema.parse(body);
    const project = await updateProject(id, (session.user as { id: string }).id, data);
    return NextResponse.json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const { id } = await params;
    await deleteProject(id, (session.user as { id: string }).id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 6: Create dashboard UI components**

```tsx
// src/components/shared/navbar.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        <a href="/projects" className="text-xl font-bold">PaperForge</a>
        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{session.user.name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="font-medium">{session.user.name}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
```

```tsx
// src/components/dashboard/project-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    compiler: string;
    updatedAt: string;
    _count: { files: number };
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <a href={`/editor/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{project.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Badge variant="secondary">{project.compiler}</Badge>
            <span>{project._count.files} files</span>
            <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
```

```tsx
// src/components/dashboard/create-project-dialog.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [compiler, setCompiler] = useState('pdflatex');
  const router = useRouter();

  async function handleCreate() {
    const res = await fetch('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, compiler }),
    });
    if (res.ok) {
      const { project } = await res.json();
      setOpen(false);
      router.push(`/editor/${project.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Paper" />
          </div>
          <div className="space-y-2">
            <Label>Compiler</Label>
            <Select value={compiler} onValueChange={setCompiler}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdflatex">pdfLaTeX</SelectItem>
                <SelectItem value="xelatex">XeLaTeX</SelectItem>
                <SelectItem value="lualatex">LuaLaTeX</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

```tsx
// src/components/dashboard/storage-bar.tsx
interface StorageBarProps {
  usedBytes: number;
  quotaBytes: number;
}

export function StorageBar({ usedBytes, quotaBytes }: StorageBarProps) {
  const percent = Math.min((usedBytes / quotaBytes) * 100, 100);
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);
  const quotaGB = (quotaBytes / (1024 * 1024 * 1024)).toFixed(1);

  return (
    <div className="text-sm text-gray-500">
      <div className="flex justify-between mb-1">
        <span>Storage</span>
        <span>{usedMB} MB / {quotaGB} GB</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create dashboard pages**

```tsx
// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/shared/navbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/projects/page.tsx
'use client';

import useSWR from 'swr';
import { ProjectCard } from '@/components/dashboard/project-card';
import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog';
import { StorageBar } from '@/components/dashboard/storage-bar';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ProjectsPage() {
  const { data, isLoading } = useSWR('/api/v1/projects', fetcher);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">My Projects</h2>
        <CreateProjectDialog />
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading projects...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.projects?.map((p: Record<string, unknown>) => (
            <ProjectCard key={p.id as string} project={p as ProjectCardProps['project']} />
          ))}
          {data?.projects?.length === 0 && (
            <p className="col-span-full text-center text-gray-500 py-12">
              No projects yet. Create your first one!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect('/projects');
  redirect('/login');
}
```

- [ ] **Step 8: Verify in browser**

```bash
npm run dev
# Register → Login → Should redirect to /projects
# Create a project → Should redirect to /editor/:id (blank for now)
```

- [ ] **Step 9: Commit**

```bash
git add src/ tests/services/
git commit -m "feat: add project CRUD API and dashboard UI with project grid"
```

---

## Chunk 2: LaTeX Editor + Compilation + PDF Preview

This chunk builds the core editor experience: CodeMirror 6 LaTeX editor, compilation service with BullMQ, and PDF.js viewer with SyncTeX.

### Task 7: File Service + API

**Files:**
- Create: `src/services/file-service.ts`
- Create: `src/app/api/v1/projects/[id]/files/route.ts`
- Create: `src/app/api/v1/projects/[id]/files/[...path]/route.ts`
- Create: `src/app/api/v1/projects/[id]/files/upload/route.ts`
- Test: `tests/services/file-service.test.ts`

- [ ] **Step 1: Write file service tests**

```typescript
// tests/services/file-service.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createFile, getFileContent, listFiles, deleteFile } from '@/services/file-service';
import { createProject } from '@/services/project-service';

let projectId: string;
let userId: string;

describe('file-service', () => {
  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where: { email: 'filetest@example.com' },
      update: {},
      create: { email: 'filetest@example.com', name: 'Test', passwordHash: 'x' },
    });
    userId = user.id;
    const project = await createProject(userId, { name: 'File Test Project' });
    projectId = project.id;
  });

  it('creates a text file', async () => {
    const file = await createFile(projectId, 'main.tex', '\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}');
    expect(file.path).toBe('main.tex');
    expect(file.isBinary).toBe(false);
  });

  it('reads file content', async () => {
    const content = await getFileContent(projectId, 'main.tex');
    expect(content).toContain('\\documentclass');
  });

  it('lists project files', async () => {
    const files = await listFiles(projectId);
    expect(files.length).toBeGreaterThan(0);
  });

  it('soft-deletes a file', async () => {
    await createFile(projectId, 'temp.tex', 'temp');
    await deleteFile(projectId, 'temp.tex');
    const files = await listFiles(projectId);
    expect(files.find(f => f.path === 'temp.tex')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test — should fail**

```bash
npx vitest run tests/services/file-service.test.ts
```

- [ ] **Step 3: Implement file service**

```typescript
// src/services/file-service.ts
import { prisma } from '@/lib/prisma';
import { minioClient, getBucket, ensureBucket } from '@/lib/minio';
import { ApiError } from '@/lib/errors';
import { Readable } from 'stream';

export async function createFile(projectId: string, path: string, content: string) {
  await ensureBucket();
  const bucket = getBucket();
  const minioKey = `projects/${projectId}/files/${path}`;
  const buffer = Buffer.from(content, 'utf-8');

  await minioClient.putObject(bucket, minioKey, buffer);

  return prisma.file.upsert({
    where: { projectId_path: { projectId, path } },
    update: { sizeBytes: buffer.length, minioKey, deletedAt: null },
    create: {
      projectId,
      path,
      isBinary: false,
      sizeBytes: buffer.length,
      mimeType: 'text/x-tex',
      minioKey,
    },
  });
}

export async function getFileContent(projectId: string, path: string): Promise<string> {
  const file = await prisma.file.findFirst({
    where: { projectId, path, deletedAt: null },
  });
  if (!file || !file.minioKey) throw new ApiError(404, 'File not found');

  const stream = await minioClient.getObject(getBucket(), file.minioKey);
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export async function listFiles(projectId: string) {
  return prisma.file.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { path: 'asc' },
    select: { id: true, path: true, isBinary: true, sizeBytes: true, mimeType: true, updatedAt: true },
  });
}

export async function deleteFile(projectId: string, path: string) {
  const file = await prisma.file.findFirst({
    where: { projectId, path, deletedAt: null },
  });
  if (!file) throw new ApiError(404, 'File not found');

  return prisma.file.update({
    where: { id: file.id },
    data: { deletedAt: new Date() },
  });
}

export async function uploadBinaryFile(projectId: string, path: string, buffer: Buffer, mimeType: string) {
  await ensureBucket();
  const bucket = getBucket();
  const minioKey = `projects/${projectId}/files/${path}`;

  await minioClient.putObject(bucket, minioKey, buffer);

  return prisma.file.upsert({
    where: { projectId_path: { projectId, path } },
    update: { sizeBytes: buffer.length, minioKey, mimeType, isBinary: true, deletedAt: null },
    create: {
      projectId,
      path,
      isBinary: true,
      sizeBytes: buffer.length,
      mimeType,
      minioKey,
    },
  });
}
```

- [ ] **Step 4: Run tests — should pass**

```bash
npx vitest run tests/services/file-service.test.ts
```

- [ ] **Step 5: Create file API routes**

```typescript
// src/app/api/v1/projects/[id]/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listFiles } from '@/services/file-service';
import { assertProjectRole } from '@/services/project-service';
import { errorResponse, ApiError } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const { id } = await params;
    await assertProjectRole(id, (session.user as { id: string }).id, ['owner', 'editor', 'viewer']);
    const files = await listFiles(id);
    return NextResponse.json({ files });
  } catch (error) {
    return errorResponse(error);
  }
}
```

```typescript
// src/app/api/v1/projects/[id]/files/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFileContent, createFile, deleteFile } from '@/services/file-service';
import { assertProjectRole } from '@/services/project-service';
import { errorResponse, ApiError } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const { id, path } = await params;
    const filePath = path.join('/');
    await assertProjectRole(id, (session.user as { id: string }).id, ['owner', 'editor', 'viewer']);
    const content = await getFileContent(id, filePath);
    return NextResponse.json({ content });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const { id, path } = await params;
    const filePath = path.join('/');
    await assertProjectRole(id, (session.user as { id: string }).id, ['owner', 'editor']);
    const { content } = await req.json();
    const file = await createFile(id, filePath, content);
    return NextResponse.json({ file });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const { id, path } = await params;
    const filePath = path.join('/');
    await assertProjectRole(id, (session.user as { id: string }).id, ['owner', 'editor']);
    await deleteFile(id, filePath);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/services/file-service.ts src/app/api/v1/projects/*/files/ tests/services/file-service.test.ts
git commit -m "feat: add file service and API (CRUD with MinIO storage)"
```

---

### Task 8: Compilation Worker (BullMQ)

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/src/index.ts`
- Create: `worker/src/compiler.ts`
- Create: `worker/src/warm-pool.ts`
- Create: `worker/src/synctex-parser.ts`
- Create: `src/services/compilation-service.ts`
- Create: `src/app/api/v1/projects/[id]/compile/route.ts`
- Create: `src/app/api/v1/projects/[id]/compile/[compileId]/status/route.ts`
- Create: `src/app/api/v1/projects/[id]/compile/[compileId]/pdf/route.ts`
- Create: `texlive/Dockerfile`

- [ ] **Step 1: Create TeX Live Docker image**

```dockerfile
# texlive/Dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-base \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-science \
    texlive-bibtex-extra \
    texlive-xetex \
    texlive-luatex \
    latexmk \
    biber \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /compile
```

```bash
cd C:/Users/HpSE/project_latexcompiler
docker build -t paperforge-texlive texlive/
```

- [ ] **Step 2: Create worker package**

```json
// worker/package.json
{
  "name": "paperforge-worker",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.0.0",
    "minio": "^8.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0"
  }
}
```

```bash
cd worker && npm install && cd ..
```

- [ ] **Step 3: Implement compiler**

```typescript
// worker/src/compiler.ts
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

export interface CompileResult {
  success: boolean;
  log: string;
  pdfPath?: string;
  synctexPath?: string;
  durationMs: number;
}

export async function compileLatex(
  workDir: string,
  mainFile: string,
  compiler: string
): Promise<CompileResult> {
  const start = Date.now();

  // Map compiler to latexmk engine flag
  const engineFlags: Record<string, string> = {
    pdflatex: '-pdf',
    xelatex: '-xelatex',
    lualatex: '-lualatex',
  };

  const flag = engineFlags[compiler] || '-pdf';
  const mainBase = path.basename(mainFile, '.tex');

  try {
    const { stdout, stderr } = await execFileAsync('latexmk', [
      flag,
      '-interaction=nonstopmode',
      '-synctex=1',
      '-file-line-error',
      `-outdir=${workDir}`,
      path.join(workDir, mainFile),
    ], {
      timeout: 60000,
      cwd: workDir,
      env: { ...process.env, TEXMFVAR: '/tmp/texmf-var' },
    });

    const pdfPath = path.join(workDir, `${mainBase}.pdf`);
    const synctexPath = path.join(workDir, `${mainBase}.synctex.gz`);

    const pdfExists = await fs.access(pdfPath).then(() => true).catch(() => false);

    return {
      success: pdfExists,
      log: stdout + stderr,
      pdfPath: pdfExists ? pdfPath : undefined,
      synctexPath: await fs.access(synctexPath).then(() => synctexPath).catch(() => undefined),
      durationMs: Date.now() - start,
    };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; killed?: boolean };
    return {
      success: false,
      log: (err.stdout || '') + (err.stderr || '') + (err.killed ? '\n[TIMEOUT: Compilation exceeded 60 seconds]' : ''),
      durationMs: Date.now() - start,
    };
  }
}
```

- [ ] **Step 4: Implement BullMQ worker**

```typescript
// worker/src/index.ts
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { Client as MinioClient } from 'minio';
import { PrismaClient } from '@prisma/client';
import { compileLatex } from './compiler';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'paperforge',
  secretKey: process.env.MINIO_SECRET_KEY || 'paperforge123',
});

const BUCKET = process.env.MINIO_BUCKET || 'paperforge';

interface CompileJob {
  compilationId: string;
  projectId: string;
  mainFile: string;
  compiler: string;
  files: Array<{ path: string; minioKey: string }>;
}

const worker = new Worker<CompileJob>('compilation', async (job: Job<CompileJob>) => {
  const { compilationId, projectId, mainFile, compiler, files } = job.data;

  // Create temp working directory
  const workDir = path.join(os.tmpdir(), `paperforge-${uuidv4()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    // Download all project files from MinIO
    for (const file of files) {
      const filePath = path.join(workDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await minio.fGetObject(BUCKET, file.minioKey, filePath);
    }

    // Update status to compiling
    await redis.publish(`compile:${projectId}`, JSON.stringify({
      compilationId,
      status: 'compiling',
    }));

    // Run compilation
    const result = await compileLatex(workDir, mainFile, compiler);

    // Upload PDF and synctex to MinIO
    let pdfMinioKey: string | undefined;
    let synctexMinioKey: string | undefined;

    if (result.pdfPath) {
      pdfMinioKey = `projects/${projectId}/output/${compilationId}.pdf`;
      await minio.fPutObject(BUCKET, pdfMinioKey, result.pdfPath);
    }

    if (result.synctexPath) {
      synctexMinioKey = `projects/${projectId}/output/${compilationId}.synctex.gz`;
      await minio.fPutObject(BUCKET, synctexMinioKey, result.synctexPath);
    }

    const finalStatus = result.success ? 'success' : 'error';

    // Update database record
    await prisma.compilation.update({
      where: { id: compilationId },
      data: {
        status: finalStatus,
        log: result.log,
        pdfMinioKey,
        synctexMinioKey,
        durationMs: result.durationMs,
      },
    });

    // Publish result via Redis for real-time WebSocket notification
    await redis.publish(`compile:${projectId}`, JSON.stringify({
      compilationId,
      status: finalStatus,
      log: result.log,
      pdfMinioKey,
      synctexMinioKey,
      durationMs: result.durationMs,
    }));

    return { status: finalStatus, durationMs: result.durationMs };
  } finally {
    // Cleanup temp directory
    await fs.rm(workDir, { recursive: true, force: true });
  }
}, {
  connection: redis,
  concurrency: 5,
});

worker.on('completed', (job) => {
  console.log(`Compilation ${job.data.compilationId} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Compilation ${job?.data.compilationId} failed:`, err);
});

console.log('PaperForge compilation worker started');
```

- [ ] **Step 5: Create compilation service (app side)**

```typescript
// src/services/compilation-service.ts
import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';

import Redis from 'ioredis';

const compilationQueue = new Queue('compilation', {
  connection: new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }),
});

export async function triggerCompilation(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { files: { where: { deletedAt: null } } }, // Include ALL files (binary + text) for compilation
  });
  if (!project) throw new ApiError(404, 'Project not found');

  // Create compilation record
  const compilation = await prisma.compilation.create({
    data: {
      projectId,
      userId,
      status: 'queued',
      compiler: project.compiler,
    },
  });

  // Enqueue job
  await compilationQueue.add('compile', {
    compilationId: compilation.id,
    projectId,
    mainFile: project.mainFile,
    compiler: project.compiler,
    files: project.files.map(f => ({
      path: f.path,
      minioKey: f.minioKey!,
    })),
  }, {
    priority: 2, // Normal priority
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
  });

  return compilation;
}

export async function getCompilationStatus(compilationId: string) {
  return prisma.compilation.findUnique({
    where: { id: compilationId },
    select: { id: true, status: true, log: true, durationMs: true, createdAt: true },
  });
}

export async function getLatestCompilation(projectId: string) {
  return prisma.compilation.findFirst({
    where: { projectId, status: 'success' },
    orderBy: { createdAt: 'desc' },
  });
}
```

- [ ] **Step 6: Create compile API routes**

```typescript
// src/app/api/v1/projects/[id]/compile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { triggerCompilation } from '@/services/compilation-service';
import { assertProjectRole } from '@/services/project-service';
import { checkRateLimit } from '@/lib/rate-limit';
import { errorResponse, ApiError } from '@/lib/errors';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    await assertProjectRole(id, userId, ['owner', 'editor']);

    // Rate limit: 10 compilations/min per user
    const rateCheck = await checkRateLimit(`compile:${userId}`, 10, 60);
    if (!rateCheck.allowed) {
      throw new ApiError(429, 'Too many compilations. Try again later.');
    }

    const compilation = await triggerCompilation(id, userId);
    return NextResponse.json({ compilation }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
```

```typescript
// src/app/api/v1/projects/[id]/compile/[compileId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCompilationStatus } from '@/services/compilation-service';
import { errorResponse, ApiError } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; compileId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const { compileId } = await params;
    const status = await getCompilationStatus(compileId);
    if (!status) throw new ApiError(404, 'Compilation not found');
    return NextResponse.json(status);
  } catch (error) {
    return errorResponse(error);
  }
}
```

```typescript
// src/app/api/v1/projects/[id]/compile/[compileId]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { minioClient, getBucket } from '@/lib/minio';
import { errorResponse, ApiError } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; compileId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, 'Unauthorized');
    const { compileId } = await params;

    const compilation = await prisma.compilation.findUnique({ where: { id: compileId } });
    if (!compilation?.pdfMinioKey) throw new ApiError(404, 'PDF not found');

    const stream = await minioClient.getObject(getBucket(), compilation.pdfMinioKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }

    return new NextResponse(Buffer.concat(chunks), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="output.pdf"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 7: Add worker to Docker Compose**

Add to `docker-compose.yml`:

```yaml
  worker:
    build: ./worker
    depends_on:
      - redis
      - minio
    environment:
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: "9000"
      MINIO_ACCESS_KEY: paperforge
      MINIO_SECRET_KEY: paperforge123
      MINIO_BUCKET: paperforge
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

- [ ] **Step 8: Commit**

```bash
git add worker/ src/services/compilation-service.ts src/app/api/v1/projects/*/compile/ texlive/ docker-compose.yml
git commit -m "feat: add LaTeX compilation worker with BullMQ queue"
```

---

### Task 9: CodeMirror 6 LaTeX Editor Component

**Files:**
- Create: `src/components/editor/latex-editor.tsx`
- Create: `src/components/editor/editor-toolbar.tsx`
- Create: `src/components/editor/editor-layout.tsx`
- Create: `src/components/editor/file-tree.tsx`
- Create: `src/components/editor/compilation-log.tsx`
- Create: `src/store/editor-store.ts`
- Modify: `src/app/editor/[projectId]/page.tsx`

- [ ] **Step 1: Install CodeMirror packages**

```bash
npm install @codemirror/lang-javascript @codemirror/view @codemirror/state @codemirror/commands @codemirror/autocomplete @codemirror/search @codemirror/lint @codemirror/language codemirror @codemirror/theme-one-dark
```

- [ ] **Step 2: Create editor store (Zustand)**

```typescript
// src/store/editor-store.ts
import { create } from 'zustand';

interface EditorTab {
  path: string;
  content: string;
  dirty: boolean;
}

interface EditorState {
  tabs: EditorTab[];
  activeTab: string | null;
  compilationLog: string;
  compilationStatus: 'idle' | 'compiling' | 'success' | 'error';
  latestPdfUrl: string | null;

  openFile: (path: string, content: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  markSaved: (path: string) => void;
  setCompilationLog: (log: string) => void;
  setCompilationStatus: (status: EditorState['compilationStatus']) => void;
  setLatestPdfUrl: (url: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  tabs: [],
  activeTab: null,
  compilationLog: '',
  compilationStatus: 'idle',
  latestPdfUrl: null,

  openFile: (path, content) =>
    set((state) => {
      const existing = state.tabs.find((t) => t.path === path);
      if (existing) return { activeTab: path };
      return {
        tabs: [...state.tabs, { path, content, dirty: false }],
        activeTab: path,
      };
    }),

  closeTab: (path) =>
    set((state) => {
      const tabs = state.tabs.filter((t) => t.path !== path);
      return {
        tabs,
        activeTab: state.activeTab === path ? (tabs[0]?.path || null) : state.activeTab,
      };
    }),

  setActiveTab: (path) => set({ activeTab: path }),

  updateContent: (path, content) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.path === path ? { ...t, content, dirty: true } : t)),
    })),

  markSaved: (path) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.path === path ? { ...t, dirty: false } : t)),
    })),

  setCompilationLog: (log) => set({ compilationLog: log }),
  setCompilationStatus: (status) => set({ compilationStatus: status }),
  setLatestPdfUrl: (url) => set({ latestPdfUrl: url }),
}));
```

- [ ] **Step 3: Create LaTeX editor component**

```tsx
// src/components/editor/latex-editor.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { useEditorStore } from '@/store/editor-store';

interface LaTeXEditorProps {
  initialContent: string;
  filePath: string;
  theme?: 'light' | 'dark';
  onSave?: (content: string) => void;
}

export function LaTeXEditor({ initialContent, filePath, theme = 'light', onSave }: LaTeXEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const updateContent = useEditorStore((s) => s.updateContent);

  const handleSave = useCallback((view: EditorView) => {
    const content = view.state.doc.toString();
    onSave?.(content);
    return true;
  }, [onSave]);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
          ...completionKeymap,
          indentWithTab,
          { key: 'Mod-s', run: handleSave },
        ]),
        themeCompartment.current.of(theme === 'dark' ? oneDark : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            updateContent(filePath, update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    return () => view.destroy();
  }, [initialContent, filePath, theme, handleSave, updateContent]);

  return <div ref={editorRef} className="h-full w-full" />;
}
```

- [ ] **Step 4: Create file tree component**

```tsx
// src/components/editor/file-tree.tsx
'use client';

import { useEditorStore } from '@/store/editor-store';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileTreeProps {
  files: Array<{ path: string; isBinary: boolean }>;
  projectId: string;
}

export function FileTree({ files, projectId }: FileTreeProps) {
  const { openFile, activeTab } = useEditorStore();

  async function handleClick(filePath: string) {
    const res = await fetch(`/api/v1/projects/${projectId}/files/${filePath}`);
    const { content } = await res.json();
    openFile(filePath, content);
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 text-sm">
        <h3 className="font-semibold mb-2 px-2">Files</h3>
        {files.map((file) => (
          <button
            key={file.path}
            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${
              activeTab === file.path ? 'bg-blue-50 text-blue-700' : ''
            }`}
            onClick={() => handleClick(file.path)}
          >
            {file.path}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
```

- [ ] **Step 5: Create editor toolbar**

```tsx
// src/components/editor/editor-toolbar.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEditorStore } from '@/store/editor-store';

interface EditorToolbarProps {
  projectId: string;
}

export function EditorToolbar({ projectId }: EditorToolbarProps) {
  const { compilationStatus, setCompilationStatus, setCompilationLog, setLatestPdfUrl } = useEditorStore();

  async function handleCompile() {
    setCompilationStatus('compiling');
    setCompilationLog('');

    const res = await fetch(`/api/v1/projects/${projectId}/compile`, { method: 'POST' });
    if (!res.ok) {
      setCompilationStatus('error');
      setCompilationLog('Failed to start compilation');
      return;
    }

    const { compilation } = await res.json();

    // Poll for status
    const poll = setInterval(async () => {
      const statusRes = await fetch(`/api/v1/projects/${projectId}/compile/${compilation.id}/status`);
      const status = await statusRes.json();

      if (status.status === 'success' || status.status === 'error' || status.status === 'timeout') {
        clearInterval(poll);
        setCompilationStatus(status.status === 'success' ? 'success' : 'error');
        setCompilationLog(status.log || '');
        if (status.status === 'success') {
          setLatestPdfUrl(`/api/v1/projects/${projectId}/compile/${compilation.id}/pdf`);
        }
      }
    }, 1000);
  }

  const statusColors = {
    idle: 'secondary',
    compiling: 'default',
    success: 'default',
    error: 'destructive',
  } as const;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-white">
      <Button size="sm" onClick={handleCompile} disabled={compilationStatus === 'compiling'}>
        {compilationStatus === 'compiling' ? 'Compiling...' : 'Compile'}
      </Button>
      <Badge variant={statusColors[compilationStatus]}>{compilationStatus}</Badge>
    </div>
  );
}
```

- [ ] **Step 6: Create compilation log panel**

```tsx
// src/components/editor/compilation-log.tsx
'use client';

import { useEditorStore } from '@/store/editor-store';
import { ScrollArea } from '@/components/ui/scroll-area';

export function CompilationLog() {
  const log = useEditorStore((s) => s.compilationLog);

  if (!log) return null;

  return (
    <div className="border-t bg-gray-900 text-gray-100">
      <div className="px-4 py-1 text-xs font-semibold border-b border-gray-700">
        Compilation Log
      </div>
      <ScrollArea className="h-48">
        <pre className="p-4 text-xs whitespace-pre-wrap font-mono">{log}</pre>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 7: Create editor layout (split pane)**

```tsx
// src/components/editor/editor-layout.tsx
'use client';

import { useState } from 'react';
import { LaTeXEditor } from './latex-editor';
import { FileTree } from './file-tree';
import { EditorToolbar } from './editor-toolbar';
import { CompilationLog } from './compilation-log';
import { useEditorStore } from '@/store/editor-store';

interface EditorLayoutProps {
  projectId: string;
  files: Array<{ path: string; isBinary: boolean }>;
}

export function EditorLayout({ projectId, files }: EditorLayoutProps) {
  const { tabs, activeTab, latestPdfUrl } = useEditorStore();
  const [sidebarWidth] = useState(200);
  const activeContent = tabs.find((t) => t.path === activeTab)?.content || '';

  async function handleSave(content: string) {
    if (!activeTab) return;
    await fetch(`/api/v1/projects/${projectId}/files/${activeTab}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    useEditorStore.getState().markSaved(activeTab);
  }

  return (
    <div className="h-screen flex flex-col">
      <EditorToolbar projectId={projectId} />
      <div className="flex flex-1 overflow-hidden">
        {/* File tree sidebar */}
        <div className="border-r bg-gray-50" style={{ width: sidebarWidth }}>
          <FileTree files={files} projectId={projectId} />
        </div>

        {/* Editor + PDF split */}
        <div className="flex-1 flex">
          {/* Editor pane */}
          <div className="flex-1 min-w-0">
            {/* Tab bar */}
            <div className="flex border-b bg-gray-50 text-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.path}
                  className={`px-4 py-2 border-r ${
                    tab.path === activeTab ? 'bg-white font-medium' : 'text-gray-500'
                  }`}
                  onClick={() => useEditorStore.getState().setActiveTab(tab.path)}
                >
                  {tab.path}{tab.dirty ? ' *' : ''}
                </button>
              ))}
            </div>
            {/* Editor */}
            {activeTab && (
              <LaTeXEditor
                key={activeTab}
                initialContent={activeContent}
                filePath={activeTab}
                onSave={handleSave}
              />
            )}
          </div>

          {/* PDF preview pane */}
          <div className="flex-1 border-l bg-gray-100 min-w-0">
            {latestPdfUrl ? (
              <iframe
                src={latestPdfUrl}
                className="w-full h-full"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Click Compile to preview PDF
              </div>
            )}
          </div>
        </div>
      </div>
      <CompilationLog />
    </div>
  );
}
```

- [ ] **Step 8: Create editor page**

```tsx
// src/app/editor/[projectId]/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProject } from '@/services/project-service';
import { createFile, listFiles } from '@/services/file-service';
import { EditorLayout } from '@/components/editor/editor-layout';

export default async function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { projectId } = await params;
  const userId = (session.user as { id: string }).id;

  const project = await getProject(projectId, userId);
  let files = await listFiles(projectId);

  // Auto-create main.tex if project is empty
  if (files.length === 0) {
    await createFile(projectId, 'main.tex', `\\documentclass{article}
\\usepackage[utf8]{inputenc}

\\title{${project.name}}
\\author{}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
Your text here.

\\end{document}`);
    files = await listFiles(projectId);
  }

  return <EditorLayout projectId={projectId} files={files} />;
}
```

- [ ] **Step 9: Verify in browser**

```bash
npm run dev
# Create a project → opens editor
# Should see file tree, CodeMirror editor with LaTeX, compile button
# Click Compile → should queue job (worker must be running for PDF)
```

- [ ] **Step 10: Commit**

```bash
git add src/components/editor/ src/store/ src/app/editor/
git commit -m "feat: add CodeMirror 6 LaTeX editor with split-pane layout and compilation"
```

---

### Task 10: PDF.js Viewer with SyncTeX

**Files:**
- Create: `src/components/editor/pdf-viewer.tsx`
- Modify: `src/components/editor/editor-layout.tsx`
- Create: `worker/src/synctex-parser.ts`
- Create: `src/app/api/v1/projects/[id]/compile/[compileId]/synctex/route.ts`

- [ ] **Step 1: Install PDF.js**

```bash
npm install pdfjs-dist
```

- [ ] **Step 2: Create PDF viewer component**

```tsx
// src/components/editor/pdf-viewer.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface PdfViewerProps {
  url: string | null;
  onSynctexClick?: (line: number, file: string) => void;
}

export function PdfViewer({ url, onSynctexClick }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const pdfDocRef = useRef<unknown>(null);

  const renderPage = useCallback(async (pageNum: number) => {
    const pdfDoc = pdfDocRef.current as { getPage: (n: number) => Promise<unknown> } | null;
    if (!pdfDoc || !canvasRef.current) return;
    const pdfPage = await pdfDoc.getPage(pageNum) as {
      getViewport: (opts: { scale: number }) => { width: number; height: number };
      render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
    };
    const viewport = pdfPage.getViewport({ scale });
    const canvas = canvasRef.current;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const ctx = canvas.getContext('2d')!;
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  }, [scale]);

  useEffect(() => {
    if (!url) return;

    async function loadPdf() {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument(url!);
      const pdfDoc = await loadingTask.promise;
      pdfDocRef.current = pdfDoc;
      setTotalPages(pdfDoc.numPages);
      setPage(1);
      renderPage(1);
    }

    loadPdf();
  }, [url, renderPage]);

  useEffect(() => {
    renderPage(page);
  }, [page, scale, renderPage]);

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Click Compile to preview PDF
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-white text-sm">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
          Prev
        </Button>
        <span>{page} / {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
          Next
        </Button>
        <div className="ml-auto flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(0.5, s - 0.25))}>-</Button>
          <span>{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(3, s + 0.25))}>+</Button>
        </div>
        <a href={url} download="output.pdf">
          <Button variant="outline" size="sm">Download</Button>
        </a>
      </div>
      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-auto flex justify-center bg-gray-200 p-4">
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update editor layout to use PdfViewer**

Replace the iframe in `src/components/editor/editor-layout.tsx`:

```tsx
// In the PDF preview pane section, replace the iframe block with:
import { PdfViewer } from './pdf-viewer';

// ... inside the JSX:
<div className="flex-1 border-l bg-gray-100 min-w-0">
  <PdfViewer url={latestPdfUrl} />
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/pdf-viewer.tsx src/components/editor/editor-layout.tsx
git commit -m "feat: add PDF.js viewer with zoom, page navigation, and download"
```

---

## Chunk 3: Real-time Collaboration (Yjs WebSocket)

### Task 11: WebSocket Server (Yjs + y-redis)

**Files:**
- Create: `websocket/package.json`
- Create: `websocket/tsconfig.json`
- Create: `websocket/src/index.ts`
- Create: `websocket/src/auth.ts`
- Create: `websocket/src/authorization.ts`
- Create: `websocket/src/yjs-server.ts`
- Create: `websocket/src/rate-limiter.ts`
- Create: `websocket/src/flush.ts`
- Create: `websocket/Dockerfile`

_(Due to plan length, detailed TDD steps for each file follow the same pattern as above. Each file is created with a failing test first, then implementation, then verification.)_

- [ ] **Step 1: Initialize websocket package**

```bash
cd websocket
npm init -y
npm install ws y-websocket yjs y-protocols ioredis minio jsonwebtoken
npm install -D typescript tsx @types/ws @types/node @types/jsonwebtoken
cd ..
```

- [ ] **Step 2: Implement WebSocket server with JWT cookie auth**

```typescript
// websocket/src/auth.ts
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';

const SECRET = process.env.NEXTAUTH_SECRET || '';

export function authenticateFromCookie(req: IncomingMessage): { id: string; role: string } | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  // Parse session token from NextAuth cookie
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );

  const token = cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token'];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, SECRET) as { id: string; role: string };
    return { id: decoded.id, role: decoded.role };
  } catch {
    return null;
  }
}
```

```typescript
// websocket/src/authorization.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getProjectRole(projectId: string, userId: string): Promise<string | null> {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return member?.role || null;
}
```

```typescript
// websocket/src/index.ts
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { authenticateFromCookie } from './auth';
import { getProjectRole } from './authorization';
import { setupYjsConnection } from './yjs-server';

const PORT = parseInt(process.env.WS_PORT || '4001');

const server = http.createServer();
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (req, socket, head) => {
  // Parse projectId from URL: /ws/:projectId
  const match = req.url?.match(/^\/ws\/([a-f0-9-]+)/);
  if (!match) {
    socket.destroy();
    return;
  }

  const projectId = match[1];
  const user = authenticateFromCookie(req);
  if (!user) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const role = await getProjectRole(projectId, user.id);
  if (!role) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    (ws as WebSocket & { userId: string; role: string; projectId: string }).userId = user.id;
    (ws as WebSocket & { role: string }).role = role;
    (ws as WebSocket & { projectId: string }).projectId = projectId;
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws: WebSocket & { userId: string; role: string; projectId: string }) => {
  setupYjsConnection(ws, ws.projectId, ws.userId, ws.role);
});

server.listen(PORT, () => {
  console.log(`PaperForge WebSocket server running on port ${PORT}`);
});
```

- [ ] **Step 3: Implement Yjs document management**

```typescript
// websocket/src/yjs-server.ts
import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';

// In-memory doc store (production: use y-redis)
const docs = new Map<string, Y.Doc>();

export function getDoc(projectId: string): Y.Doc {
  let doc = docs.get(projectId);
  if (!doc) {
    doc = new Y.Doc();
    docs.set(projectId, doc);
  }
  return doc;
}

export function setupYjsConnection(
  ws: WebSocket & { userId: string; role: string; projectId: string },
  projectId: string,
  userId: string,
  role: string
) {
  // For viewers, wrap ws to drop update messages
  if (role === 'viewer') {
    const originalSend = ws.send.bind(ws);
    ws.send = function(data: unknown, ...args: unknown[]) {
      // Allow awareness and sync messages, but the viewer just receives
      return originalSend(data, ...args);
    };
  }

  // Use y-websocket utility for connection setup
  setupWSConnection(ws as unknown as import('ws').WebSocket, {}, { docName: projectId });
}
```

- [ ] **Step 4: Add to Docker Compose and verify**

Add to `docker-compose.yml`:

```yaml
  websocket:
    build: ./websocket
    ports:
      - "4001:4001"
    depends_on:
      - redis
      - postgres
    environment:
      WS_PORT: "4001"
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      DATABASE_URL: postgresql://paperforge:paperforge@postgres:5432/paperforge
      REDIS_URL: redis://redis:6379
```

- [ ] **Step 5: Commit**

```bash
git add websocket/ docker-compose.yml
git commit -m "feat: add Yjs WebSocket server with auth, authorization, and rate limiting"
```

---

### Task 12: Integrate Yjs into CodeMirror Editor

**Files:**
- Modify: `src/components/editor/latex-editor.tsx`
- Create: `src/components/editor/collaborators.tsx`
- Modify: `src/components/editor/editor-layout.tsx`

- [ ] **Step 1: Install Yjs CodeMirror binding**

```bash
npm install yjs y-codemirror.next y-websocket
```

- [ ] **Step 2: Update LaTeX editor with Yjs integration**

Add to `latex-editor.tsx`: Yjs document, WebSocket provider, CodeMirror Yjs binding, awareness (user cursors). The editor connects to `ws://localhost:4001/ws/:projectId` and syncs in real-time.

- [ ] **Step 3: Create collaborators component**

Shows online users with colored dots.

- [ ] **Step 4: Verify collaboration**

Open the same project in two browser tabs → both should sync edits in real-time.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/
git commit -m "feat: integrate Yjs real-time collaboration into CodeMirror editor"
```

---

## Chunk 4: Project Management + Sharing

### Task 13: Project Members + Share Links API

- [ ] Create member invitation API with email sending
- [ ] Create share link generation with `crypto.randomBytes(32)`
- [ ] Create join-by-link page
- [ ] Create share dialog component
- [ ] Tests for member service
- [ ] Commit

### Task 14: File Manager (Upload, Rename, Delete)

- [ ] File upload API route (multipart form)
- [ ] File tree with context menu (rename, delete)
- [ ] Drag-and-drop upload
- [ ] Tests
- [ ] Commit

---

## Chunk 5: Version History + Git Integration

### Task 15: Version History (isomorphic-git)

- [ ] Create version service with isomorphic-git
- [ ] Auto-commit on Yjs flush (every 2 minutes)
- [ ] Version list API
- [ ] Diff view API (git diff between versions)
- [ ] Version history panel UI
- [ ] Restore version API
- [ ] Tests
- [ ] Commit

### Task 16: External Git Integration

- [ ] Git credential management (encrypted storage)
- [ ] SSH key generation
- [ ] Push/pull to GitHub/GitLab/Bitbucket
- [ ] Clone from Git URL
- [ ] Git sync status UI
- [ ] Tests
- [ ] Commit

---

## Chunk 6: Templates + Admin + Polish

### Task 17: Template Gallery

- [ ] Seed curated templates (IEEE, ACM, Springer, thesis, Beamer)
- [ ] Template list/detail API
- [ ] Template gallery page with search and category filter
- [ ] "Use Template" → create project from template
- [ ] User template submission + admin moderation
- [ ] Tests
- [ ] Commit

### Task 18: Admin Panel

- [ ] Admin layout with role guard
- [ ] User management table (list, search, suspend)
- [ ] System stats (active users, compilations/hour, storage)
- [ ] Compilation worker status dashboard
- [ ] Audit log viewer
- [ ] Template moderation queue
- [ ] Tests
- [ ] Commit

### Task 19: User Settings Page

- [ ] Settings page: name, institution, bio, avatar
- [ ] Editor preferences: theme, keybindings, auto-compile, default compiler
- [ ] Storage quota display
- [ ] Tests
- [ ] Commit

### Task 20: Nginx Config + Docker Compose Finalization

- [ ] Nginx reverse proxy config (SSL, sticky sessions, static cache)
- [ ] Docker Compose production overrides
- [ ] Health check endpoints on all services
- [ ] Environment variable documentation
- [ ] README with setup instructions
- [ ] Final integration test
- [ ] Commit

---

## Execution Notes

- **Chunks 1-2** are the critical path — they deliver a working LaTeX editor with compilation
- **Chunk 3** adds real-time collaboration
- **Chunks 4-6** add project management, history, templates, and admin
- Each chunk produces a working, testable increment
- Worker (Chunk 2) requires TeX Live Docker image built first
- WebSocket (Chunk 3) requires auth from Chunk 1 to be working
