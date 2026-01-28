from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API Configuration
    app_name: str = "IKF AI Playground"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # CORS
    cors_origins: list[str] = ["http://localhost:5001", "http://127.0.0.1:5001", "http://localhost:3000"]
    
    # Server
    host: str = "127.0.0.1"
    port: int = 8000
    
    # API Keys
    tavily_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    
    # Supabase
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    supabase_db_url: Optional[str] = None  # PostgreSQL connection URL for Agno
    
    # Database - SQLite for sessions (legacy, Agno agent only)
    sqlite_db_path: str = "tmp/ikf_sessions.db"
    
    # Firestore (stub for future)
    firestore_project_id: Optional[str] = None
    firestore_credentials_path: Optional[str] = None
    
    # Auth (stub for future)
    secret_key: Optional[str] = None
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()
