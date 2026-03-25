"""
Bridge configuration via environment variables or a .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="",
    )

    constellation_group: str = "constellation"
    constellation_interface: list[str] | None = None
    log_level: str = "INFO"
    host: str = "0.0.0.0"
    port: int = 8000
    poll_interval: float = 0.5  # seconds between heartbeat state polls
