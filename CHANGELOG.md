# Changelog

All notable changes to PaperForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-27

### Added
- **LaTeX Editor**: CodeMirror 6 with custom LaTeX syntax highlighting, 70+ autocomplete commands, bracket auto-closing, and LaTeX formatting toolbar
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
