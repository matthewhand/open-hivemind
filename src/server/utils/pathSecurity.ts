import { basename, join, resolve, sep } from 'path';

/**
 * PathSecurityUtils provides utilities to prevent path traversal vulnerabilities.
 */
export class PathSecurityUtils {
  /**
   * Constructs a safe absolute path within a base directory.
   *
   * @param baseDir The trusted base directory where the file should reside.
   * @param fileName The untrusted filename or relative path.
   * @returns The resolved absolute path if safe.
   * @throws Error if path traversal is detected or the name is invalid.
   */
  public static getSafePath(baseDir: string, fileName: string): string {
    // 1. Sanitize the filename to remove any directory components
    const sanitizedName = basename(fileName);

    // 2. Construct the target path
    const targetPath = join(baseDir, sanitizedName);

    // 3. Resolve to absolute paths for comparison
    const resolvedBase = resolve(baseDir);
    const resolvedTarget = resolve(targetPath);

    // 4. Boundary check: Ensure the resolved target is still within the resolved base
    // Note: We check if it starts with base + separator to ensure it's a child,
    // or if it's exactly the base (if allowed).
    if (!resolvedTarget.startsWith(resolvedBase + sep) && resolvedTarget !== resolvedBase) {
      throw new Error('Security Error: Path traversal detected');
    }

    return targetPath;
  }
}
