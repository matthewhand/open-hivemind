"""
Tests for application configuration security guarantees.

These tests pin the behaviour introduced when the hardcoded ``secret_key``
default was removed from ``app.core.config.Settings``:

* the key is *required* (the app fails securely on startup when it is missing);
* empty / whitespace-only keys are rejected;
* well-known insecure placeholders (including the old hardcoded ``"secret-key"``)
  are rejected;
* trivially short keys are rejected;
* a strong key is accepted and surfaced unchanged.
"""
import pytest
from pydantic import ValidationError

from app.core.config import (
    Settings,
    get_settings,
    _INSECURE_SECRET_KEYS,
    _MIN_SECRET_KEY_LENGTH,
)

# A representative strong key used across the "happy path" assertions.
STRONG_KEY = "x" * _MIN_SECRET_KEY_LENGTH + "-strong-random-value"


def _settings(**overrides):
    """Build a Settings instance from explicit kwargs.

    Passing ``_env_file=None`` prevents a developer's local ``.env`` from
    leaking into these tests, so each case is fully deterministic.
    """
    return Settings(_env_file=None, **overrides)


def test_secret_key_is_required(monkeypatch):
    """Omitting secret_key raises a validation error (fail-secure startup)."""
    # conftest seeds SECRET_KEY for the rest of the suite; remove it here so we
    # genuinely exercise the "missing required field" path.
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(ValidationError) as exc_info:
        _settings()
    errors = exc_info.value.errors()
    assert any(e["loc"] == ("secret_key",) for e in errors)
    assert any(e["type"] == "missing" for e in errors)


@pytest.mark.parametrize("blank", ["", "   ", "\t", "\n  "])
def test_empty_secret_key_is_rejected(blank):
    """Empty or whitespace-only keys must not satisfy the required check."""
    with pytest.raises(ValidationError) as exc_info:
        _settings(secret_key=blank)
    assert "must not be empty" in str(exc_info.value)


@pytest.mark.parametrize("placeholder", sorted(_INSECURE_SECRET_KEYS))
def test_known_insecure_placeholders_are_rejected(placeholder):
    """The previously hardcoded default and friends are denylisted."""
    with pytest.raises(ValidationError) as exc_info:
        _settings(secret_key=placeholder)
    assert "insecure placeholder" in str(exc_info.value)


def test_old_hardcoded_default_is_rejected():
    """Regression guard: the exact removed default must never be accepted."""
    with pytest.raises(ValidationError):
        _settings(secret_key="secret-key")


def test_short_secret_key_is_rejected():
    """Keys shorter than the minimum length are rejected."""
    short = "a" * (_MIN_SECRET_KEY_LENGTH - 1)
    with pytest.raises(ValidationError) as exc_info:
        _settings(secret_key=short)
    assert "at least" in str(exc_info.value)


def test_minimum_length_key_is_accepted():
    """A key exactly at the boundary is accepted."""
    boundary = "a" * _MIN_SECRET_KEY_LENGTH
    settings = _settings(secret_key=boundary)
    assert settings.secret_key == boundary


def test_strong_secret_key_is_accepted_unchanged():
    """A strong key passes validation and is exposed verbatim."""
    settings = _settings(secret_key=STRONG_KEY)
    assert settings.secret_key == STRONG_KEY


def test_secret_key_read_from_environment(monkeypatch):
    """The key is sourced from the SECRET_KEY environment variable."""
    monkeypatch.setenv("SECRET_KEY", STRONG_KEY)
    settings = Settings(_env_file=None)
    assert settings.secret_key == STRONG_KEY


def test_get_settings_is_cached():
    """get_settings returns a single shared, cached instance."""
    get_settings.cache_clear()
    first = get_settings()
    second = get_settings()
    assert first is second


def test_no_hardcoded_secret_in_source():
    """The source must not reintroduce a hardcoded secret_key default."""
    import inspect

    import app.core.config as config_module

    source = inspect.getsource(config_module.Settings)
    # The field must be declared without an assigned default value.
    assert "secret_key: str\n" in source
    assert 'secret_key: str = "secret-key"' not in source
