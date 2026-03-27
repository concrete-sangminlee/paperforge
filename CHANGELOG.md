# Changelog

All notable changes to PaperForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-27

### Added
- **Inline LaTeX Linter**: Real-time error detection in editor gutter — unclosed braces, mismatched environments, common typos (\being → \begin), $$ deprecation warnings
- **LaTeX Code Folding**: Fold \begin{env}...\end{env} blocks and section ranges with nested depth tracking via foldGutter
- **Comment Toggle**: Ctrl+/ (Cmd+/) to toggle % comments on selected lines with smart uncomment detection
- **Find in Project**: Ctrl+Shift+F cross-file search with highlighted results and click-to-navigate
- **Word Count Goal**: Set target word count with progress bar (blue → amber → green) persisted to localStorage
- **Smart Word Count**: Strips LaTeX commands for accurate text-only counting
- **BibTeX Autocomplete**: 7 entry types (@article, @inproceedings, @book, etc.) with full template expansion
- **Document Outline Panel**: Real-time section parsing with click-to-navigate and hierarchical indentation
- **Editor Status Bar**: File type, line/word/char count, encoding, font size, modified indicator
- **Clickable Errors**: Click compilation error lines (l.42) to jump to source in editor
- **Dynamic Imports**: React.lazy for right-panel components (VersionHistory, GitPanel, DocumentOutline)
- **ZIP Export**: One-click project download with rate limiting (10/hour)
- **Tab Context Menu**: Right-click for Close, Close Others, Close All
- **Bracket Auto-close**: Auto-pair {}, [], (), "", $$

### Changed
- Smart word count now strips LaTeX commands before counting
- Status bar stats debounced (300ms) for large document performance

### Security
- Login rate limiting: 10 attempts per 5 minutes per email
- Session cookie hardening: httpOnly, sameSite:lax, secure in production
- ZIP export rate limiting: 10 per hour per user

---

## [1.0.0] - 2026-03-27

### Added
- **LaTeX Editor**: CodeMirror 6 with custom LaTeX syntax highlighting, 70+ autocomplete commands, 12 snippet templates, bracket auto-closing, and LaTeX formatting toolbar
- **Document Outline**: Real-time section parser showing document structure with click-to-navigate
- **Error Navigation**: Clickable compilation errors jump to source line, structured diagnostics summary
- **Project Export**: One-click ZIP download of entire project
- **Status Bar**: Real-time word count, line count, file type, encoding display
- **Real-time Collaboration**: Yjs CRDT-based conflict-free editing with multi-cursor support, per-user colors, and presence awareness
- **PDF Preview**: Split-pane PDF.js viewer with keyboard navigation, zoom controls, fit-to-width/page, page jump, fullscreen mode, and download
- **Compilation**: BullMQ-powered LaTeX compilation (pdflatex, xelatex, lualatex) with real-time auto-compile (2s debounce) and DOCX export via Pandoc
- **Version History**: Git-backed version management with timeline UI, diff viewer, named snapshots, and one-click restore
- **Git Integration**: Push/pull to GitHub, GitLab, Bitbucket with encrypted credential storage (AES-256-GCM)
- **Template Gallery**: Curated academic templates (IEEE, ACM, Springer, Beamer, thesis, CV) with one-click project creation
- **Command Palette**: Cmd+K/Ctrl+K searchable command palette with navigation, editor actions, LaTeX snippets, and theme switching
- **Dashboard**: Project search/sort/filter, grid/list views, role-based access, compiler badges, quick actions
- **Settings**: 5-tab settings (Profile, Security, Editor, Notifications, Appearance) with password change and account deletion
- **Admin Panel**: Real-time stats dashboard, user management, template moderation, audit log, worker monitoring
- **Authentication**: Email/password with verification, OAuth (Google, GitHub), password reset, brute force protection
- **Security**: HSTS, CSP, CORS middleware, rate limiting on all auth endpoints, file upload validation, path traversal prevention, XSS prevention
- **Infrastructure**: Docker Compose with 8 services, nginx with gzip/rate limiting, worker graceful shutdown, WebSocket error handling
- **PWA**: Web manifest for installability
- **CI/CD**: GitHub Actions pipeline (lint, typecheck, test, build), Dependabot auto-updates
- **Testing**: 53 unit tests across 6 suites (API responses, validation, errors, encryption, rate limiting, LaTeX completions)
- **Editor UX**: Status bar (word/line/char count), tab context menu, sidebar toggle, log panel collapse, keyboard shortcuts dialog, connection status indicator, toast notifications, unsaved changes warning, beforeunload protection
- **Accessibility**: Skip-to-content link, ARIA labels, keyboard navigation, screen reader support
- **SEO**: Comprehensive meta tags, Open Graph, Twitter cards, dynamic sitemap, robots.txt

### Security
- Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- CORS middleware with origin validation
- Rate limiting: 5/15min on auth, 10/min on compilation
- File upload: MIME whitelist, blocked extensions, 50MB limit
- Input validation: Zod schemas with XSS prevention on all endpoints
- Encryption: AES-256-GCM for OAuth tokens and Git credentials
- SECURITY.md with vulnerability reporting guidelines

## [0.1.0] - 2026-03-26

### Added
- Initial release with core LaTeX editor, PDF preview, and compilation
- User authentication and project management
- Basic template gallery and file management
