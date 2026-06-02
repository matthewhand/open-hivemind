"""
Application configuration settings.
"""
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings


# Minimum acceptable length for a secret key. 16 characters is the floor below
# which a key offers little brute-force resistance.
_MIN_SECRET_KEY_LENGTH = 16

# Placeholders that have historically shipped as insecure defaults and must
# never be accepted in any environment.
_INSECURE_SECRET_KEYS = frozenset(
    {"secret-key", "secret_key", "secret", "changeme", "change-me", "password"}
)


class Settings(BaseSettings):
    app_name: str = "Tenancy API"
    database_url: str = "sqlite:///./test.db"
    # Sentinel: There is intentionally no default for ``secret_key``.
    #
    # A hardcoded default (e.g. ``"secret-key"``) silently weakens every
    # deployment that forgets to override it, and a per-process random default
    # (``secrets.token_urlsafe(32)``) breaks stateful features such as signed
    # sessions/JWTs across multiple workers because each process would mint a
    # different key. Omitting the default delegates enforcement to Pydantic,
    # which forces the application to fail securely on startup when the
    # ``SECRET_KEY`` environment variable is missing.
    secret_key: str
    debug: bool = True

    @field_validator("secret_key")
    @classmethod
    def _secret_key_must_be_strong(cls, value: str) -> str:
        """Reject empty, placeholder, or trivially short secret keys.

        Pydantic's "required" check only guarantees the field is *present*; an
        empty string (``SECRET_KEY=""``) or a well-known placeholder would still
        satisfy it while re-introducing the very weakness this guard exists to
        prevent. Enforcing a minimum length and a placeholder denylist closes
        those gaps at startup rather than letting a weak key reach production.
        """
        stripped = value.strip()
        if not stripped:
            raise ValueError(
                "SECRET_KEY must not be empty. Provide a strong, random value "
                "via the SECRET_KEY environment variable."
            )
        if stripped.lower() in _INSECURE_SECRET_KEYS:
            raise ValueError(
                "SECRET_KEY is set to a well-known insecure placeholder. "
                "Generate a strong value, e.g. `python -c \"import secrets; "
                'print(secrets.token_urlsafe(32))"`.'
            )
        if len(stripped) < _MIN_SECRET_KEY_LENGTH:
            raise ValueError(
                f"SECRET_KEY must be at least {_MIN_SECRET_KEY_LENGTH} "
                "characters long to be cryptographically meaningful."
            )
        return value

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> "Settings":
    """Return the application settings singleton.

    Using an accessor (rather than only a module-level instance) lets tests and
    alternate entry points construct/override settings deterministically without
    relying on a particular import order, while production code still shares a
    single cached instance.
    """
    return Settings()


# Backwards-compatible module-level singleton. Existing imports
# (``from app.core.config import settings``) continue to work unchanged.
settings = get_settings()
