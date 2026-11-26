# ALL×PROJECT V8

A full-stack application foundation with working database-backed registration/login sessions and a server-side ULTRA multi-provider chat route. It is not yet a production-complete implementation of every requested ALL×PROJECT feature; use the feature status honestly and follow the hardening checklist below.

## Implemented in this repository

- Responsive, accessible landing/workspace UI and PWA manifest.
- Email/password registration and login using bcrypt password hashes, HTTP-only `SameSite=Lax` session cookies, hashed session tokens, revocation on logout, login history, and basic audit events.
- Prisma/PostgreSQL models for users, roles/permissions, sessions, login events, audit events, AI conversation history, and usage.
- ULTRA server route with provider adapters for OpenAI, Google Gemini OpenAI-compatible endpoint, Anthropic Messages, xAI, DeepSeek and GitHub Models. API credentials are read from server environment only. The UI/API reports whether credentials are configured; configured does not mean provider health has been verified.
- Authenticated AI calls persist owned conversation messages and usage events, validate input, apply timeout and a per-process rate limit, and allow provider fallback.
- Health endpoint reports configuration without claiming that the database or integrations were successfully contacted.

## Not production-ready yet

Email verification, password reset/recovery, MFA, secure file/object storage, push delivery, role-progression jobs, full developer control panel, permission management endpoints, auto-fix patch execution, voice stickers, licensed music, the remaining feature categories, native Android/iOS builds, and complete unit/integration/e2e/security tests are not implemented. Rate limiting currently lives in process memory and is unsuitable for horizontally scaled/serverless production. Provider APIs/models change; verify current provider access and model availability before launch. Do not label this system production-ready until these gaps are implemented and tested.

## Setup

Requirements: Node.js 20+, PostgreSQL, npm.

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a PostgreSQL database and set a long random `SESSION_SECRET` (for example, generate 32+ random bytes).
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Create/apply a local schema migration using `npm run db:migrate`.
6. Run `npm run dev`.
7. Optional: configure one or more AI provider credentials in the server environment. Never prefix secrets with `NEXT_PUBLIC_` and never put them into client code.

New accounts are created as `ACTIVE` and assigned the `MEMBER` role. Configure role seeding, abuse controls, email verification, and operator bootstrap before public signup. Avoid creating a public developer-registration route.

## Production hardening gate

- Use managed PostgreSQL with encrypted connections, migration review, backups and restore drills.
- Replace process-local rate limits with a shared store; add signup/login abuse controls and account recovery.
- Configure a stable HTTPS origin, secure cookie policy, secret manager and key rotation.
- Add provider health checks, spend limits, moderation policy and robust provider-specific error handling.
- Add authorization-checked admin routes, developer bootstrap, ban/unban history and role policy tests.
- Add file scanning/private object storage, notification provider, and data retention/privacy policy before enabling those features.
- Build native Android/iOS packaging only after choosing and testing a supported wrapper/toolchain.
- Run lint, typecheck, unit, integration, auth/RBAC, API, responsive and security tests in CI. No test/build has been run by the GitHub file-edit tool for this change.

## Quality commands

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run db:migrate`
