from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hybrid POS System"
    API_V1_STR: str = "/api/v1"
    
    # Modo de despliegue: 'DESKTOP' (Offline) o 'SERVER' (Online)
    DEPLOYMENT_MODE: str = "DESKTOP"
    
    # Base de datos: Por defecto SQLite para dev/local
    DATABASE_URL: str = "sqlite:///./local_pos_new.db"
    
    # Seguridad
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_SECRET_KEY"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 dias
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Supabase Storage
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
