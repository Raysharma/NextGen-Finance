from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "NextGen Finance API"
    database_url: str = "sqlite:///./banking.db"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24
    algorithm: str = "HS256"
    allowed_origins: str = "*"
    debug_otp: bool = True


settings = Settings()
