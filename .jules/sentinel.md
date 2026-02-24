## 2025-05-15 - Host Header Authentication Bypass

**Vulnerability:** The authentication middleware used `.includes('localhost')` to check `Host` and `Origin` headers for localhost detection, allowing attackers to bypass authentication by using domains like `evil-localhost.com`.

**Learning:** Trusting client-supplied headers like `Host` and `Origin` for security decisions is inherently risky. Even when intended for local development convenience, loose string matching (`.includes()`) can open critical security holes in production if not strictly validated or disabled.

**Prevention:**
1.  Prefer `req.ip` for localhost detection.
2.  If headers must be checked, use strict equality or strict prefix matching (e.g., `host === 'localhost' || host.startsWith('localhost:')`).
3.  Avoid features that bypass authentication based on network location unless absolutely necessary and strictly scoped.
