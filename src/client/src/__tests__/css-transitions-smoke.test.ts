/**
 * Regression guard for PR #2708 (perf(client): replace transition: all
 * and gate density transitions).
 *
 * PR #2708 replaced 13 `transition: all` declarations in index.css with
 * explicit property lists. The risk it introduced: if a future commit
 * accidentally drops a `transition:` line entirely from one of those
 * rules (during a refactor, a merge resolution, etc.), the hover/focus
 * animations on that element silently vanish — no console error, no
 * visual diff in static snapshots, just a subtle UX regression.
 *
 * This file is a deliberately simple string-presence smoke test:
 *   1. Read index.css as raw text.
 *   2. Locate each known selector's rule body.
 *   3. Assert the rule body contains a `transition:` declaration.
 *
 * It does NOT parse CSS. That means it is intentionally brittle to
 * extreme reformatting (e.g. moving the transition to a separate
 * selector via cascade) — accepted tradeoff for a tiny test that
 * catches the actual regression we care about: the transition line
 * being removed entirely.
 *
 * The selector list is the set modified by PR #2708. If a selector is
 * intentionally retired, remove it from this list AND record why in
 * the commit message.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const cssPath = join(__dirname, '../index.css');
const css = readFileSync(cssPath, 'utf8');

/**
 * Extract the body of the FIRST rule in `css` whose selector list
 * contains `selector` as a complete entry (comma-delimited or alone).
 * Returns null if no such rule exists.
 *
 * This is a string scan, not a CSS parser — it accepts any whitespace
 * around `{` and assumes top-level rules (no @-rule nesting tricks).
 */
function findRuleBody(source: string, selector: string): string | null {
  // Escape regex metacharacters in the selector, then allow flexible
  // whitespace between tokens (so `.menu li>a` matches `.menu li > a`).
  const escaped = selector
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s*>\s*/g, '\\s*>\\s*')
    .replace(/\s+/g, '\\s+');

  // Match the selector as a standalone entry in a comma-separated list,
  // bounded by start-of-rule, comma, or whitespace before `{`.
  const selectorPattern = new RegExp(
    `(?:^|[},])\\s*(?:[^{},]*,\\s*)*${escaped}(?:\\s*,[^{]*)?\\s*\\{([^}]*)\\}`,
    'm',
  );
  const match = source.match(selectorPattern);
  return match ? match[1] : null;
}

/**
 * Selectors PR #2708 modified. Each MUST retain at least one
 * `transition:` declaration somewhere in its rule body.
 */
const SELECTORS_REQUIRING_TRANSITION: readonly string[] = [
  '.stat',
  '.btn',
  '.menu li>a',
  '.menu li>button',
  '.table tr',
  '.input',
  '.textarea',
  '.select',
  '.tabs-boxed .tab',
  '.tabs-lifted .tab',
  '.dropdown-content li>a',
  '.dropdown-content li>button',
  '.modal-box .btn-circle.btn-ghost',
];

describe('CSS transition declarations (PR #2708 regression guard)', () => {
  for (const selector of SELECTORS_REQUIRING_TRANSITION) {
    it(`rule "${selector}" still declares a transition`, () => {
      const body = findRuleBody(css, selector);
      expect(
        body,
        `Could not locate rule for selector "${selector}" in index.css. ` +
          `Either the selector was renamed (update this test) or the rule was ` +
          `removed (likely a regression of PR #2708).`,
      ).not.toBeNull();
      expect(
        body!,
        `Rule "${selector}" exists but has no \`transition:\` declaration. ` +
          `PR #2708 explicitly added one — silently dropping it removes ` +
          `the hover/focus animation.`,
      ).toMatch(/transition\s*:/);
    });
  }
});
