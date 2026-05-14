## 2025-05-14 - Removed hardcoded secret key in FastAPI config
**Vulnerability:** A hardcoded `secret_key` default value (`"secret-key"`) was present in the FastAPI `Settings` class (`app/core/config.py`).
**Learning:** Hardcoded secrets in configuration files can easily lead to insecure deployments if developers forget to override them with environment variables, especially in multi-tenant systems.
**Prevention:** Remove default values for sensitive configuration parameters like secret keys or API keys. By defining them without defaults (e.g., `secret_key: str`), frameworks like Pydantic will raise a validation error on startup if the required environment variable is not provided, adhering to the "fail secure" principle.
