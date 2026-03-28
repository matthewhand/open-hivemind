/**
 * Shared accessibility test setup.
 *
 * Configures axe-core via jest-axe with WCAG 2.1 AA rules enabled and
 * exports a pre-configured `axe` runner for reuse across test suites.
 *
 * Note: color-contrast is disabled because jsdom does not implement
 * getComputedStyle or canvas rendering, which axe-core needs to
 * evaluate contrast ratios. Color contrast should be tested via
 * Playwright or manual audits instead.
 */
import { configureAxe } from 'jest-axe';

export const axe = configureAxe({
  rules: {
    // WCAG 2.1 AA compliance rules
    'label': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    'role-img-alt': { enabled: true },
    'select-name': { enabled: true },
    // Disabled: jsdom cannot compute styles or render canvas
    'color-contrast': { enabled: false },
    // Disabled: test fragments are not full pages
    'region': { enabled: false },
  },
});
