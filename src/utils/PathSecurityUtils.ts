import { promises as fs } from 'fs';
import path from 'path';

/**
 * Security utilities for safe file path operations.
 * Prevents path traversal attacks and ensures paths stay within allowed directories.
 */
export class PathSecurityUtils {
  /**
   * Validates that a resolved path is within an allowed base directory.
   * Prevents path traversal attacks like "../../../etc/passwd"
   *
   * @param targetPath - The path to validate
   * @param allowedBasePath - The base directory that paths must be within
   * @returns True if path is safe, false otherwise
   *
   * @example
   * ```typescript
   * const safe = PathSecurityUtils.isPathWithinDirectory(
   *   '/app/uploads/user/../../../etc/passwd',
   *   '/app/uploads'
   * );
   * // Returns: false
   * ```
   */
  static isPathWithinDirectory(targetPath: string, allowedBasePath: string): boolean {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedBase = path.resolve(allowedBasePath);

    // Check if resolved path starts with base path
    // Use path.sep to ensure we're checking directory boundaries
    return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
  }

  /**
   * Sanitizes a filename by removing directory separators and path traversal sequences.
   * Use this for user-provided filenames before joining with a base path.
   *
   * @param filename - The filename to sanitize
   * @returns Sanitized filename safe for use in paths
   *
   * @example
   * ```typescript
   * const safe = PathSecurityUtils.sanitizeFilename('../../../etc/passwd');
   * // Returns: 'etcpasswd'
   * ```
   */
  static sanitizeFilename(filename: string): string {
    // Use basename to strip any directory components
    return path.basename(filename);
  }

  /**
   * Validates and returns a safe path within a base directory.
   * Combines sanitization and validation in one step.
   *
   * @param basePath - The allowed base directory
   * @param userProvidedPath - User-provided filename or relative path
   * @returns Safe path within base directory
   * @throws Error if path validation fails
   *
   * @example
   * ```typescript
   * const safePath = PathSecurityUtils.getSafePath(
   *   '/app/uploads',
   *   'user-file.txt'
   * );
   * // Returns: '/app/uploads/user-file.txt'
   *
   * // This throws:
   * PathSecurityUtils.getSafePath('/app/uploads', '../etc/passwd');
   * ```
   */
  static getSafePath(basePath: string, userProvidedPath: string): string {
    // Sanitize the user input
    const sanitized = this.sanitizeFilename(userProvidedPath);

    // Join with base path
    const fullPath = path.join(basePath, sanitized);

    // Validate it stays within base directory
    if (!this.isPathWithinDirectory(fullPath, basePath)) {
      throw new Error('Invalid path: Path traversal detected');
    }

    return fullPath;
  }

  /**
   * Validates that a path exists and is within an allowed directory.
   * Useful for operations on existing files.
   *
   * @param targetPath - Path to validate
   * @param allowedBasePath - Base directory that must contain the path
   * @returns Validated path
   * @throws Error if path is invalid or doesn't exist
   */
  static async validateExistingPath(targetPath: string, allowedBasePath: string): Promise<string> {
    // Validate path is within allowed directory
    if (!this.isPathWithinDirectory(targetPath, allowedBasePath)) {
      throw new Error('Invalid path: Path traversal detected');
    }

    // Check if path exists
    try {
      await fs.access(targetPath);
    } catch {
      throw new Error('Path does not exist');
    }

    return targetPath;
  }

  /**
   * Validates a filename matches allowed patterns.
   * Useful for additional validation beyond path traversal prevention.
   *
   * @param filename - Filename to validate
   * @param options - Validation options
   * @returns True if filename is valid
   *
   * @example
   * ```typescript
   * PathSecurityUtils.isValidFilename('user-file_123.txt', {
   *   allowedExtensions: ['.txt', '.pdf'],
   *   maxLength: 255
   * });
   * ```
   */
  static isValidFilename(
    filename: string,
    options: {
      allowedExtensions?: string[];
      maxLength?: number;
      allowedPattern?: RegExp;
    } = {}
  ): boolean {
    const { allowedExtensions, maxLength = 255, allowedPattern = /^[a-zA-Z0-9_.-]+$/ } = options;

    // Check length
    if (filename.length > maxLength) {
      return false;
    }

    // Check pattern
    if (!allowedPattern.test(filename)) {
      return false;
    }

    // Check extension if specified
    if (allowedExtensions && allowedExtensions.length > 0) {
      const ext = path.extname(filename).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return false;
      }
    }

    return true;
  }
}
