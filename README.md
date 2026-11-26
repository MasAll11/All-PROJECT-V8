# ALL×PROJECT V8

A full-stack product build-in-progress. The repository was empty at kickoff, so this commit establishes the web application, responsive visual system, health endpoint, environment contract, and relational data model without claiming that unfinished integrations are live.

## Current implementation

- Next.js App Router with a responsive, accessible starting experience.
- `/api/health` reports configured environment state honestly; `configured_not_checked` does not mean a service was successfully contacted.
- PostgreSQL/Prisma schema foundations for accounts, RBAC, revocable sessions, login events, audit logs, AI conversations/messages, feature registry, and usage tracking.
- PWA manifest foundation.

## Not production-ready yet

Authentication flows, authorization middleware, schema migrations, shared rate limiting, provider adapters, persistent storage, push delivery, role progression, auto-fix execution, voice stickers, native APK packaging, and automated tests are not implemented in this foundation. Do not deploy this as a production service or enter production secrets until those controls and tests are in place. Providers are never presented as connected just because this UI exists.

## Local setup

1. Install Node.js 20+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run `npm install`.
4. Run `npx prisma generate`.
5. Create migrations with `npm run db:migrate`.
6. Start development with `npm run dev`.

Configure API keys only in the server environment or a secret manager, never in client code. Use HTTPS, managed database backups, monitoring, and a shared rate-limit store before production.

## Quality checks

- `npm run typecheck`
- `npm run build`
- `npm run db:migrate`

This repository still needs unit, integration, authentication, authorization, security, responsive, and end-to-end coverage before any production-readiness claim.
