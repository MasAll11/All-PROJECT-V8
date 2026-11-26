# ALL×PROJECT V8 — Feature register

Statuses are evidence-based: `PRODUCTION` is reserved for features with deployed service configuration and passing relevant tests. `READY` means implemented locally and still requires deployment verification.

| Feature | Status | Frontend | Backend | Database | API | Auth | Permission | Tests | Security | Error handling | Production status |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Responsive workspace shell | DEVELOPMENT | Yes | N/A | N/A | N/A | No | N/A | Not run | Basic | Basic | Not production verified |
| Registration/login | DEVELOPMENT | Yes | Yes | Yes | Yes | Yes | Partial | Not run | Password hash, HttpOnly cookie | Basic | Requires recovery, email verification, shared rate limiter and testing |
| ULTRA provider chat | DEVELOPMENT | Yes | Yes | Yes | Yes | Yes | Member | Not run | Server-side secrets, validation | Provider fallback | Requires provider health/spend policies, streaming and testing |
| Member list, ban/suspend, role edits | DEVELOPMENT | Not yet | Yes | Yes | Yes | Yes | Developer/admin role gate | Not run | Self-protection, audit events | API errors | Requires role hierarchy policy tests and seeded role policies |
| Session viewing/revocation | DEVELOPMENT | Not yet | Yes | Yes | Yes | Yes | Owner-scoped | Not run | Hashed bearer token | API errors | Requires testing |
| Notification inbox/read state | DEVELOPMENT | Not yet | Yes | Yes | Yes | Yes | Owner-scoped | Not run | Owner-scoped update | API errors | Push delivery not included |
| Active usage measurement | DEVELOPMENT | Partial | Yes | Yes | Yes | Yes | Owner-scoped | Not run | Server-capped heartbeat interval | API errors | Requires abuse review and background progression job |
| Voice stickers / secure file storage | PLANNED | No | Schema only | Yes | No | N/A | N/A | Not run | No upload route/storage provider yet | N/A | Not available |
| Push notifications | PLANNED | No | Subscription schema only | Yes | No | N/A | N/A | Not run | No VAPID/provider | N/A | Not available |
| Auto-fix bot / developer AI | PLANNED | No | No | Approval schema only | No | N/A | N/A | Not run | No code execution path by design | N/A | Not available; production edits must require human approval |
| Music/audio, finance, learning, health, browser, social and APK | PLANNED | No | No | Partial | No | N/A | N/A | Not run | N/A | N/A | Not available |

## Important

This registry describes code present in the repository, not a promise that integrations are deployed. Never execute arbitrary generated patches directly in a production runtime. Build/test in an isolated CI environment and require approval for privileged or security-sensitive changes.
