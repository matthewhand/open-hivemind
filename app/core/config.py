"""
Application configuration settings.
"""
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Tenancy API"
    database_url: str = "sqlite:///./test.db"
    # Sentinel: Removed hardcoded secret key to prevent security vulnerabilities.
    # By omitting the default, Pydantic's BaseSettings ensures it must be provided
    # in the environment, failing securely on startup otherwise.
    secret_key: str
    debug: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
