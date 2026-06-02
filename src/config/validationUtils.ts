import { isValidUrl } from '../common/urlUtils';

export function validateUrl(key: string, value: string): string {
  if (!value || !isValidUrl(value)) {
    throw new Error(`Invalid URL for ${key}: ${value}`);
  }
  return value;
}

export function validateString(key: string, value: string, allowed?: string[]): string {
  if (!value) {
    throw new Error(`Value required for ${key}`);
  }
  if (allowed && !allowed.includes(value)) {
    throw new Error(`Invalid value for ${key}: ${value}. Allowed: ${allowed.join(', ')}`);
  }
  return value;
}

export function validateEnum(key: string, value: string, allowed: string[]): string {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid value for ${key}: ${value}. Allowed: ${allowed.join(', ')}`);
  }
  return value;
}