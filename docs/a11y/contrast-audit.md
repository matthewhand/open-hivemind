# Kill-switch contrast audit

The navbar kill-switch (`src/client/src/components/DaisyUI/NavbarWithSearch.tsx`)
is a destructive control that must remain visible across every DaisyUI theme
the project enables. This document records measured WCAG contrast ratios and
the styling that satisfies them.

## How to reproduce

```
node scripts/a11y/contrast-audit.mjs              # markdown table
node scripts/a11y/contrast-audit.mjs --json       # machine-readable output
```

The script reads `--color-error`, `--color-base-100`, and
`--color-error-content` directly from `node_modules/daisyui/theme/<name>.css`,
converts the OKLCH values to sRGB, and computes the WCAG 2.x relative-luminance
ratio. No external dependencies.

## Themes audited

The 16 themes enabled in `src/client/src/index.css` via the
`@plugin "daisyui" { themes: ... }` directive:

dark, night, light, dracula, cupcake, emerald, corporate, synthwave,
cyberpunk, forest, aqua, business, coffee, dim, nord, sunset.

## Results

The trigger is icon-only (`<ShieldAlert>` with `aria-label`), so the relevant
success criterion is **WCAG 2.2 SC 1.4.11 Non-text Contrast (>= 3:1)**.
Small-text contrast (SC 1.4.3, >= 4.5:1) is reported for completeness but is
not load-bearing for this control.

Two pairings are measured:

- **Pre-fix** — `btn btn-ghost text-error` paints a `--color-error` glyph
  on the navbar's `--color-base-100` surface. This was PR #2710's claim.
- **Post-fix** — `btn btn-error` paints a `--color-error-content` glyph on
  a `--color-error` fill. This is what the navbar ships today.

| Theme | --color-error | --color-base-100 | --color-error-content | btn-ghost text-error vs base-100 | >= 3:1 | >= 4.5:1 | btn-error (content vs error) | >= 3:1 | >= 4.5:1 |
|---|---|---|---|---|---|---|---|---|---|
| dark | #ff627d | #1d232a | #4d0218 | 5.52 | PASS | PASS | 5.47 | PASS | PASS |
| night | #fb7085 | #0f172a | #150406 | 6.60 | PASS | PASS | 7.36 | PASS | PASS |
| light | #ff627d | #ffffff | #4d0218 | 2.87 | FAIL | FAIL | 5.47 | PASS | PASS |
| dracula | #ff5555 | #282a36 | #160202 | 4.53 | PASS | PASS | 6.39 | PASS | PASS |
| cupcake | #fe1c55 | #faf7f5 | #4d0218 | 3.57 | PASS | FAIL | 4.12 | PASS | FAIL |
| emerald | #ff5861 | #ffffff | #000000 | 3.08 | PASS | FAIL | 6.83 | PASS | PASS |
| corporate | #ff6266 | #ffffff | #000000 | 2.92 | FAIL | FAIL | 7.20 | PASS | PASS |
| synthwave | #ec8c78 | #09002f | #201047 | 8.16 | PASS | PASS | 7.00 | PASS | PASS |
| cyberpunk | #ff5861 | #fff248 | #000000 | 2.64 | FAIL | FAIL | 6.83 | PASS | PASS |
| forest | #ff5861 | #1b1717 | #000000 | 5.79 | PASS | PASS | 6.83 | PASS | PASS |
| aqua | #ff7265 | #1a368b | #180403 | 4.03 | PASS | FAIL | 7.40 | PASS | PASS |
| business | #ac3e31 | #202020 | #f2d8d4 | 2.71 | FAIL | FAIL | 4.47 | PASS | FAIL |
| coffee | #fc9581 | #261b25 | #150806 | 7.70 | PASS | PASS | 9.12 | PASS | PASS |
| dim | #ffae9b | #2a303c | #160b09 | 7.43 | PASS | PASS | 10.85 | PASS | PASS |
| nord | #bf616a | #eceff4 | #0d0304 | 3.55 | PASS | FAIL | 4.97 | PASS | PASS |
| sunset | #ffbbbd | #121c22 | #160d0d | 10.78 | PASS | PASS | 11.94 | PASS | PASS |

### Summary

- `btn btn-ghost text-error` fails SC 1.4.11 (3:1) on **4 / 16 themes**:
  `light`, `corporate`, `cyberpunk`, `business`. PR #2710's claim that
  removing the `/60` opacity restored compliance is incorrect — the underlying
  `text-error` token is itself too low-contrast against `bg-base-100` on the
  light/medium themes.
- `btn btn-error` (filled) passes SC 1.4.11 on **all 16 themes**.

The navbar therefore uses filled `btn-error` for the kill-switch trigger. The
active panic state is distinguished by `animate-pulse` and a red glow shadow,
not by colour.

## Why not other options

- `btn btn-outline btn-error` — text colour is still `--color-error` against
  `--color-base-100`; the border helps perception but does not change the
  measured ratio for the icon glyph itself.
- `btn-ghost text-error font-bold` plus `bg-error/10` — both glyph and
  background tint share the error hue; ratio is well below 3:1.
- `btn-soft btn-error` — same hue family for fg/bg, fails for the same reason.

`btn-error` (filled) is the simplest pairing where DaisyUI guarantees the
`color` vs `color-content` relationship across every theme.
