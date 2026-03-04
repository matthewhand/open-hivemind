/**
 * Utility functions for formatting and evaluating metrics
 */

/**
 * Safely detects if a given value represents a fundamentally "zero" quantity.
 * Handles numbers and string representations like "0", "0%", "0.0", "0ms".
 */
export const isZeroValue = (value: string | number | undefined | null): boolean => {
    if (value === 0) return true;
    if (!value && value !== 0) return false;

    if (typeof value === 'string') {
        // Strip common metric units (%, ms, s, mb, gb, etc) and whitespace
        const stripped = value.replace(/[%a-zA-Z\s]/g, '');
        const num = parseFloat(stripped);
        return !isNaN(num) && num === 0;
    }

    return false;
};
