## 2024-05-18 - [MEDIUM] Replace insecure Math.random() ID generation
**Vulnerability:** Weak PRNG (`Math.random()`) used for generating UI component IDs in React.
**Learning:** While usually harmless for simple React keys, using `Math.random()` triggers security linters (Weak PRNG hotspots). Furthermore, pulling in external dependencies like `uuid` can cause build failures if not explicitly declared in `package.json`.
**Prevention:** Use native browser APIs like `crypto.randomUUID()` for robust, dependency-free ID generation instead of `Math.random()`.
