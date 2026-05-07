from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://webinar:webinar_pass@localhost/webinardb"
    redis_url: str = "redis://localhost:6379"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    admin_email: str = "admin@example.com"
    admin_password: str = "changeme123"
    cors_origins: str = "http://localhost"
    bunny_api_key: str = ""
    bunny_library_id: str = ""
    bunny_cdn_hostname: str = ""
    bunny_security_key: str = ""
    password_reset_token_minutes: int = 30
    expose_password_reset_token: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
