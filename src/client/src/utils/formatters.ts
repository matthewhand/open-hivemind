/**
 * Formats a number with thousands separators
 */
export function formatNumber(
  value: number,
  decimals: number = 2,
  locale: string = 'en-US',
): string {
  if (!isFinite(value)) {return '0';}

  try {
    // For integers, don't show decimals unless explicitly requested
    const isInteger = Number.isInteger(value);
    const actualDecimals = isInteger && decimals === 2 ? 0 : decimals;

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: actualDecimals,
      maximumFractionDigits: actualDecimals,
    }).format(value);
  } catch {
    return value.toFixed(decimals);
  }
}

/**
 * Formats a date using Intl.DateTimeFormat
 */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  locale: string = 'en-US',
): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(
  bytes: number,
  decimals: number = 2,
): string {
  if (bytes < 0) {return '0 B';}

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  // For bytes, don't show decimals
  const actualDecimals = unitIndex === 0 ? 0 : decimals;
  return `${formatNumber(size, actualDecimals)} ${units[unitIndex]}`;
}

/**
 * Truncates text to a specified length with optional suffix
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number,
  suffix: string = '...',
  preserveWords: boolean = false,
): string {
  if (!text) {return '';}

  if (text.length <= maxLength) {return text;}

  if (preserveWords) {
    const words = text.split(' ');
    let result = '';

    for (const word of words) {
      if ((result + word).length + 1 > maxLength - suffix.length) {
        break;
      }
      result += (result ? ' ' : '') + word;
    }

    return result + suffix;
  }

  const truncateAt = maxLength - suffix.length;
  return text.substring(0, Math.max(0, truncateAt)) + suffix;
}