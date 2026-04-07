## 2024-04-07 - SSRF mitigation requires careful async error handling
**Vulnerability:** Eager validation of URLs using an async validation function (`isSafeUrl(url).then(safe => { if (!safe) throw new Error(...) })`) inside a synchronous constructor leads to Unhandled Promise Rejections.
**Learning:** If the async check fails, it throws a floating error since the constructor is synchronous and no `.catch` handler intercepts it, resulting in a process crash (a self-inflicted DoS).
**Prevention:** Always await async validation checks like `isSafeUrl` inside the async request lifecycle (e.g. immediately before `fetch()`), rather than attempting eager validation in the constructor.
