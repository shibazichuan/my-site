from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://mysite:changeme@localhost:5432/mysite"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    upload_dir: str = "./data/uploads"
    cors_origins: str = "http://localhost"
    deepseek_api_key: str = ""
    deepseek_api_base: str = "https://api.deepseek.com/v1"
    daily_chat_quota: int = 50

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
