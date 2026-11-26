# ALL×PROJECT V8

Full-stack application under active development. Current work adds database-backed account/AI foundations plus developer member actions, session management, account notifications, active-use measurement and the schema groundwork for secure file handling, voice stickers and guarded developer approvals.

## Implemented code paths

- Responsive workspace shell and PWA manifest.
- Email/password registration and login, bcrypt password hashes, HTTP-only `SameSite=Lax` sessions, hashed session tokens, login history and audit entries.
- PostgreSQL/Prisma relational schema for accounts, roles/permissions, sessions, audit, ULTRA chat history, usage, role policy/history, notifications, push subscription records, storage metadata, voice stickers, feature registry and developer approvals.
- ULTRA server route with OpenAI, Google, Anthropic, xAI, DeepSeek and GitHub Models adapters; provider keys remain server-side; persisted conversation ownership; timeouts and fallback.
- Developer API for member search/filter and audited status/role changes with backend role checks.
- Account session list, revoke-this/revoke-all, notification inbox/read state, and capped active usage heartbeats.

## Important deployment boundary

This is not yet a production-complete system. A new database migration must be reviewed and applied before using the latest schema. Run `npm run db:migrate` locally and commit the reviewed migration. No migration or automated test/build was run by this GitHub edit workflow.

Some requested features remain unimplemented: email verification/recovery/MFA, configurable durable rate limiting, developer dashboard UI, complete permission administration and seeded roles/permissions, secure object-storage upload/download, push delivery, voice-sticker moderation/playback, role-progression worker, safe AUTO-FIX pipeline, music player with licensed audio, remaining feature categories, native APK packaging, and comprehensive test suite. See `FEATURE_REGISTRY.md`.

Never claim all features are production-ready until each registry row has tests and deployment evidence. Provider keys belong in a server secret manager, not client bundles. Use HTTPS, database backups and restore drills, monitoring, CI security scans, spend controls and a shared rate-limit backend before public deployment.

## Local setup

Requirements: Node.js 20+, npm and PostgreSQL.

1. Copy `.env.example` to `.env`; configure `DATABASE_URL` and a long random `SESSION_SECRET`.
2. Run `npm install`.
3. Run `npm run db:generate`.
4. Review/apply a schema migration with `npm run db:migrate`.
5. Run `npm run dev`.
6. Configure desired provider API keys only in the server environment. A key being configured is not a successful provider health check.

## Quality gate

Run `npm run lint`, `npm run typecheck`, `npm run build`, and database migration checks, then add and run unit/integration/API/auth/RBAC/UI/security tests in CI. The current edit tool cannot run these checks, so build health must be verified in GitHub Actions or a local environment before release.
