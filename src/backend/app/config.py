from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API Configuration
    app_name: str = "IKF AI Playground"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # CORS
    cors_origins: list[str] = ["http://localhost:5001", "http://127.0.0.1:5001", "http://localhost:3000", "http://localhost:3001", "http://0.0.0.0:3001","*"]
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # API Keys
    tavily_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    
    # Database
    sqlite_db_path: str = "data/ikf_chat.db"
    
    # Safety controls
    allow_unauthenticated_conversation_delete: bool = False

    
    
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
        extra = "ignore"  # Ignore extra env vars like old Supabase settings


# Global settings instance
settings = Settings()
