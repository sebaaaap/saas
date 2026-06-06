from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional, Union

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
    
    # CORS — acepta string CSV desde env var o lista directa
    # En Railway, setea: CORS_ORIGINS=https://a.com,https://b.com
    CORS_ORIGINS: Union[list[str], str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://saas-self-alpha-78.vercel.app",
        "https://saas-git-main-sebaaaps-projects.vercel.app",
        "https://saas-c4br9u9tg-sebaaaps-projects.vercel.app",
        "https://*.vercel.app",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            v = v.strip()
            # Formato JSON: ["https://a.com", "https://b.com"]
            if v.startswith("["):
                import json
                return [o.strip() for o in json.loads(v) if o.strip()]
            # Formato CSV: https://a.com,https://b.com
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # Supabase Storage
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
