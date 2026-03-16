## 2026-03-09 - [O(1) lookups over O(N) mapping in get methods]
**Learning:** `getBot(id)` in `BotManager` was triggering an expensive O(N) map of *all* configured bots on every single request because it relied on `getAllBots()`. This meant full environment override resolution and config sanitization for every bot in the system, just to return one.
**Action:** When working on retrieval methods, directly target the underlying storage/map mechanisms (like `botConfigManager.getBot(id)`) and selectively apply transformation logic to the single result, skipping full-collection getters.

## 2026-03-09 - [O(1) lookups over O(N) mapping in file reads]
**Learning:** `loadBuiltInTemplates()` in `ConfigurationTemplateService.ts` was triggering an expensive O(N) reading of *all* template files via `getTemplateById` sequentially inside a loop on instantiation. Because it awaited `fs.readFile` and ran `JSON.parse` on every existing file, it blocked process instantiation.
**Action:** Replace multiple file payload reads with a single directory read (`fs.readdir`) to extract just the filenames, allowing O(1) existence checks using a `Set<string>`. Keep bulk validation cheap.
