from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    rabbitmq_url: str
    prefetch_count: int = 10
    reconnect_seconds: float = 3.0
    service_name: str = "verification-python"
    service_version: str = "0.1.0"
