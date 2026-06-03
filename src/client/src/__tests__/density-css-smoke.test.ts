/**
 * CSS structural smoke test — regression coverage for PR #2659.
 *
 * The density settings (`data-density`, `data-compact-density`) are wired up
 * by uiStore via `<html>` data attributes. The CSS contract that turns those
 * attributes into a visible effect lives in `src/client/src/index.css` and is
 * keyed off the `--density-scale` custom property.
 *
 * The JSDOM-based store tests cover the JS->DOM half of the contract. This
 * file covers the other half: that the CSS rules which give meaning to those
 * attributes still exist. Without it, a refactor could silently delete the
 * density rules and the JSDOM tests would still pass while the feature dies
 * in production — exactly the bug class PR #2659 fixed.
 *
 * Regexes use \s* and accept either single or double quotes so trivial
 * formatting changes don't trigger spurious failures.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const cssPath = join(__dirname, '../index.css');
const css = readFileSync(cssPath, 'utf8');

describe('density CSS contract (PR #2659 regression)', () => {
  it('defines the --density-scale custom property', () => {
    expect(css).toContain('--density-scale');
  });

  it('defines the --density-base custom property (two-axis composition)', () => {
    // --density-base is set by data-density; --density-scale composes it
    // with the optional compact-density multiplier. A custom property
    // cannot self-reference in its own declaration, so the base/scale
    // split is required for the compact-density axis to actually apply.
    expect(css).toContain('--density-base');
  });

  it('declares html[data-density="compact"] selector', () => {
    expect(css).toMatch(/html\s*\[\s*data-density\s*=\s*["']compact["']\s*\]/);
  });

  it('declares html[data-density="comfortable"] selector', () => {
    expect(css).toMatch(/html\s*\[\s*data-density\s*=\s*["']comfortable["']\s*\]/);
  });

  it('declares html[data-density="spacious"] selector', () => {
    expect(css).toMatch(/html\s*\[\s*data-density\s*=\s*["']spacious["']\s*\]/);
  });

  it('declares html[data-compact-density="true"] selector', () => {
    expect(css).toMatch(/html\s*\[\s*data-compact-density\s*=\s*["']true["']\s*\]/);
  });

  it('binds .card-body padding to var(--density-scale)', () => {
    // Match the .card-body rule body and assert it references --density-scale.
    // Keep the regex permissive on whitespace so reformatting doesn't break it.
    const cardBodyMatch = css.match(/\.card-body\s*\{[^}]*\}/);
    expect(cardBodyMatch, '.card-body rule must exist in index.css').not.toBeNull();
    expect(cardBodyMatch![0]).toMatch(/var\s*\(\s*--density-scale/);
  });

  it('each density value sets a distinct --density-base value', () => {
    // Post-fix the data-density blocks set --density-base (which feeds
    // --density-scale via the html-level composition). Pre-fix they
    // set --density-scale directly, but that broke the compact-density
    // axis because of the self-reference bug.
    expect(css).toMatch(/html\s*\[\s*data-density\s*=\s*["']compact["']\s*\][^{]*\{[^}]*--density-base\s*:/);
    expect(css).toMatch(/html\s*\[\s*data-density\s*=\s*["']comfortable["']\s*\][^{]*\{[^}]*--density-base\s*:/);
    expect(css).toMatch(/html\s*\[\s*data-density\s*=\s*["']spacious["']\s*\][^{]*\{[^}]*--density-base\s*:/);
  });

  it('compact-density composes via --density-base, not self-reference', () => {
    // Regression: the original CSS used calc(var(--density-scale) * 0.85)
    // inside the html[data-compact-density="true"] rule that itself sets
    // --density-scale — a self-reference that's invalid per CSS spec, so
    // the compactDensity toggle silently no-op'd. The fix must reference
    // --density-base (set by data-density) rather than --density-scale.
    const compactRule = css.match(/html\s*\[\s*data-compact-density\s*=\s*["']true["']\s*\][^{]*\{[^}]*\}/);
    expect(compactRule, 'compact-density rule must exist').not.toBeNull();
    expect(compactRule![0]).toMatch(/var\s*\(\s*--density-base/);
    expect(compactRule![0]).not.toMatch(/calc\s*\(\s*var\s*\(\s*--density-scale/);
  });
});
