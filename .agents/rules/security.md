# Rule: security baseline

## Secrets
- Never read, print or edit `.env`. New settings go into `.env.example` with a placeholder and a comment.
- No secret, token or password in code, tests, fixtures, logs or `work/` artifacts.

## Authentication
- Passwords hashed with argon2id or bcrypt (cost >= 12). Never log or return a password or hash.
- Sessions/JWT in an `httpOnly`, `secure` (in production), `sameSite=lax` cookie. Not in localStorage.
- Short-lived access token; logout clears the cookie. Login errors are generic ("Email hoặc mật khẩu không đúng").
- Rate-limit the login route (for example `@nestjs/throttler`).

## Authorization (RBAC)
- Deny by default. Every admin route has a server-side guard; the UI check is only convenience.
- A user can never set or change their own role through any public endpoint or DTO field.
- Check ownership on every resource fetched by id (no IDOR).
- Admin seed comes from env variables, never a hard-coded password.

## Input and output
- Validate every DTO (class-validator or zod). Reject unknown fields (whitelist / forbidNonWhitelisted).
- Error responses keep the existing `requestId` shape and never leak stack traces or SQL.
- If cookies carry auth, protect state-changing requests against CSRF (sameSite + origin check or token).
