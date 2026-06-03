## 2024-06-03 - ExecuteCommandSafe Standardization
**Vulnerability:** Command injection vulnerability in exec/child_process wrappers.
**Learning:** Legacy codebase patterns often wrap `child_process.exec` or `execSync` directly with shell execution, allowing unsanitized parameters (like git URLs or user-provided repository arguments) to break out of the command.
**Prevention:** Always use a standardized wrapper (like `executeCommandSafe`) that enforces array-based argument separation, explicitly rejecting shell evaluation by avoiding string interpolation for command parameters.
