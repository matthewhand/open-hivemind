## 2025-03-03 - Path Traversal Prevention in Dynamic Filenames
**Vulnerability:** The backup download and restore endpoints dynamically constructed file paths using an unvalidated `backup.name` string directly in `path.join()`. This allowed path traversal if a backup's name contained `../` sequences.
**Learning:** Even when reading metadata from an internal, trusted directory (`listBackups()` reads `.meta` files), the strings within that metadata (like `backup.name`) must still be treated as untrusted input if they were originally sourced from users during creation, especially when they are subsequently used to construct file paths.
**Prevention:** Always use `path.resolve()` on the base directory and the constructed target path, then explicitly verify that the target path `startsWith(resolvedBaseDir + path.sep)` before performing any file operations.
## 2024-11-20 - Replace Weak Random Number Generation for Event IDs
**Vulnerability:** Predictable `Math.random()` values were being used as part of unique ID generation for real-time events (notifications, validation reports, message flows).
**Learning:** While not directly exploitable for session hijacking, weak IDs in real-time streams could theoretically allow event guessing or collision in high-throughput scenarios. `Math.random()` should never be used where uniqueness or security is required.
**Prevention:** Use standard `crypto.randomUUID()` for all newly generated system IDs instead of relying on custom string concatenation with `Date.now()` and `Math.random()`.
