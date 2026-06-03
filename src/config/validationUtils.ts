import { isValidUrl } from '../common/urlUtils';
import { ValidationError } from '../types/errorClasses';

/**
 * Validates that a value is a valid URL
 */
export function validateUrl(name: string, val: any): void {
  if (typeof val !== 'string') {
    throw new ValidationError(
      'Value must be a string',
      name,
      val,
      'string',
      ['Must be a valid string']
    );
  }
  if (!isValidUrl(val)) {
    throw new ValidationError(
      'Value must be a valid URL',
      name,
      val,
      'valid URL',
      ['Must be a properly formatted URL']
    );
  }
}

/**
 * Validates that a value is a string
 */
export function validateString(name: string, val: any): void {
  if (typeof val !== 'string') {
    throw new ValidationError(
      'Value must be a string',
      name,
      val,
      'string',
      ['Must be a valid string']
    );
  }
}

/**
 * Validates that a value is one of the allowed enum values
 */
export function validateEnum(name: string, val: any, allowed: string[]): void {
  if (!allowed.includes(val)) {
    throw new ValidationError(
      `Value must be one of: ${allowed.join(', ')}`,
      name,
      val,
      allowed,
      [`Allowed values: ${allowed.join(', ')}`]
    );
  }
}
