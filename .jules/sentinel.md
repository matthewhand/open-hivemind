## 2025-05-15 - Host Header Authentication Bypass

**Vulnerability:** The authentication middleware used `.includes('localhost')` to check `Host` and `Origin` headers for localhost detection, allowing attackers to bypass authentication by using domains like `evil-localhost.com`.

**Learning:** Trusting client-supplied headers like `Host` and `Origin` for security decisions is inherently risky. Even when intended for local development convenience, loose string matching (`.includes()`) can open critical security holes in production if not strictly validated or disabled.

**Prevention:**
1.  Prefer `req.ip` for localhost detection.
2.  If headers must be checked, use strict equality or strict prefix matching (e.g., `host === 'localhost' || host.startsWith('localhost:')`).
3.  Avoid features that bypass authentication based on network location unless absolutely necessary and strictly scoped.

## 2025-05-20 - Optional Auth Middleware Misuse

**Vulnerability:** Sensitive endpoints (`/api/errors/stats`, `/api/errors/recent`) were exposed without authentication because they were mounted under a router using `optionalAuth`, which allows unauthenticated access.

**Learning:** Middleware applied at the router level (like `app.use('/api/errors', optionalAuth, errorsRouter)`) applies to all routes within that router. If some routes require strict authentication while others don't, mixing them under `optionalAuth` is dangerous.

**Prevention:**
1.  Explicitly add `authenticateToken` to sensitive routes within the router, or split public and private routes into separate routers.
2.  Always verify access control for endpoints returning system internals.
