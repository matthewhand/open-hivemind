# Density System

The WebUI ships with a runtime-tunable spacing system that lets users pick a base
density (`compact` / `comfortable` / `spacious`) plus an independent
`compactDensity` boolean that further tightens spacing. Both settings are
combined into a single CSS custom property, `--density-scale`, applied to the
`<html>` element. Surfaces opt in by multiplying their padding by that variable,
so a single source of truth drives all spacing.

## How it's wired (state to DOM to CSS)

State lives in the Zustand UI store: [`src/client/src/store/uiStore.ts`](../src/client/src/store/uiStore.ts).

- `density: 'compact' | 'comfortable' | 'spacious'` — declared at line 20, default at line 118.
- `compactDensity: boolean` — declared at line 13, default at line 111.
- `setDensity` (line 326) and `setCompactDensity` (line 299) update Zustand,
  persist to `localStorage` under keys `density` and `compactDensity`, and write
  the matching attributes to `document.documentElement`:
  - `data-density="..."`
  - `data-compact-density="true|false"`
- `initializeFromLocalStorage()` (line 364) restores both values on boot and
  re-applies the `<html>` attributes (lines 415-416). It is invoked at module
  load on line 431, so the DOM is correct before React mounts.

CSS rules live in [`src/client/src/index.css`](../src/client/src/index.css):

```css
:root { --density-scale: 1; }                                              /* line 17 */
html[data-density="compact"]    { --density-scale: 0.7; }                  /* line 20 */
html[data-density="comfortable"]{ --density-scale: 1; }                    /* line 21 */
html[data-density="spacious"]   { --density-scale: 1.25; }                 /* line 22 */
html[data-compact-density="true"] { --density-scale: calc(var(--density-scale) * 0.85); } /* line 24 */
```

The `compactDensity` rule deliberately reads and overwrites the same variable,
so the two axes compose multiplicatively without requiring extra JS.

## Math

| density       | scale | with `compactDensity=true` (× 0.85) |
| ------------- | ----- | ----------------------------------- |
| `compact`     | 0.70  | 0.595                               |
| `comfortable` | 1.00  | 0.850                               |
| `spacious`    | 1.25  | 1.0625                              |

The minimum effective scale is `0.7 × 0.85 = 0.595`. Keep this floor in mind
when sizing interactive surfaces — see Known Constraints below.

## Where it applies today

As of `main` (post-PRs #2659, #2665, #2669), these rules consume
`var(--density-scale)`:

- `.card-body` padding
- `.stat` padding
- `.modal-box` padding
- `.menu li > a` and `.menu li > button` padding (with a
  `min-height: 2.75rem` AAA touch-target floor — see Known Constraints)
- `.table th` and `.table td` padding
- `.fab-mobile` size and offset

Any other surface that "feels" density-aware is just inheriting from one of the
above.

## How to add a new density-aware surface

Wrap any padding/spacing value in a `calc()` that multiplies by the variable,
and always include the `, 1` fallback so unscoped use (Storybook, isolated
snapshot tests, emails) keeps the original value:

```css
.my-thing {
  padding: calc(1rem * var(--density-scale, 1));
  gap:     calc(0.5rem * var(--density-scale, 1));
}
```

Rules of thumb:

- Use it for `padding`, `gap`, `margin`, and component-level offsets like the
  FAB's `bottom`.
- **Do not** use it for absolute font sizes — text scales via the user's
  browser zoom and the typography scale, not density.
- **Do not** use it for border widths or radii — those should stay crisp at
  every density.

## UX entry points

Two surfaces in the live app let users change density today, and they share the
same Zustand actions (`setDensity`, `setCompactDensity`):

- **Navbar quick-toggle** (PR #2666). Cycles
  `compact → comfortable → spacious` from the global header. Best for fast
  one-handed iteration; the icon and aria-label announce the next state.
- **Settings page** — `/admin/settings` → *General* → *Display Density* card.
  Renders a `<Select>` for the three-way density choice plus a `<Toggle>` for
  the boolean `compactDensity` axis ("Extra-compact mode"). Implemented in
  `src/client/src/components/Settings/SettingsGeneral.tsx`. This is the
  discoverable home for both controls and the only place `compactDensity` can
  be flipped from the UI.

Historical note: an earlier orphan component at
`src/client/src/components/Settings.tsx` held a density `<select>` that was
never mounted in the router. It was removed in PR #2702. The Settings-page
controls listed above replace it.

## Known constraints

- **Touch target floor.** At the minimum scale (0.595), interactive surfaces
  styled purely with density-scaled padding can fall below the WCAG AAA touch
  target floor. Pair `--density-scale` padding with an explicit
  `min-height: 2.75rem` (or equivalent) on interactive selectors.
- **Font sizes.** `--density-scale` must not be used for absolute font sizes;
  doing so cascades into accessibility and layout-shift problems.
- **One axis only.** The two `data-*` attributes are designed to be the only
  inputs. Don't add a third axis without revisiting the `calc()` in line 24 —
  multiplying three independent factors gets unreadable fast.

## Roadmap

Possible future surfaces — none scheduled:

- Form-control padding (currently Tailwind-utility-driven, would need a custom
  rule first)
- Card-to-card grid `gap` (currently Tailwind utility — same caveat)

Add these only if the slider's effect feels uneven without them. Resist the
urge to wire density everywhere; the goal is *visible reflow* on toggle, not
*every pixel scaled*.
