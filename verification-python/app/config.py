from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    rabbitmq_url: str
    smtp_url: str = "smtp://localhost:1025"
    mail_from: str = "Peak Paz <cuentas@peakpaz.local>"
    smtp_timeout_seconds: float = 15.0
    prefetch_count: int = 10
    reconnect_seconds: float = 3.0
    service_name: str = "verification-python"
    service_version: str = "0.2.0"
