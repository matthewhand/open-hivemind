"""
Application configuration settings.
"""
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Tenancy API"
    database_url: str = "sqlite:///./test.db"
    secret_key: str = "secret-key"
    debug: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
