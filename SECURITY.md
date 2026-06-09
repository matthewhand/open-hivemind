# Security Policy

## Reporting a Vulnerability

Please **do not open a public GitHub issue** for security vulnerabilities.

Instead, report privately via one of:

- **GitHub private vulnerability reporting** (preferred): use the
  ["Report a vulnerability"](https://github.com/matthewhand/open-hivemind/security/advisories/new)
  button on this repository's Security tab.
- **Email**: matthewhand.au@gmail.com with the subject line `[SECURITY] open-hivemind`.

Include a description of the issue, steps to reproduce, and the affected
version/commit if known. You can expect an acknowledgement within 7 days.

## Supported Versions

Only the latest release (and the `main` branch) receives security fixes.

## Hardening Guidance

Operational hardening documentation lives in
[docs/SECURITY_HARDENING.md](docs/SECURITY_HARDENING.md). In particular, never
enable `ALLOW_TEST_BYPASS`, `DISABLE_ENCRYPTION`, or `FORCE_TRUSTED_LOGIN` on a
deployment reachable by anyone you don't trust — see `.env.sample` for the
full warnings.
