import base64
import json
import os
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Holdings View API"
    API_V1_STR: str = "/api/v1"
    
    ENVIRONMENT: str = "development"
    DISABLE_AUTH_FOR_DEV: bool = False

    REDIS_URL_DOCKER: Optional[str] = None
    REDIS_URL_LOCAL: Optional[str] = None

    # --- MAKE THESE OPTIONAL ---
    # These are only required for local/testing environments.
    # In production, we'll use the single PRODUCTION_DATABASE_URL.
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    POSTGRES_PORT: Optional[str] = None
    POSTGRES_DB_TEST: Optional[str] = None

    # This is required for production.
    PRODUCTION_DATABASE_URL: Optional[str] = None

    # These are always required
    BACKEND_CORS_ORIGINS: str
    FIREBASE_SERVICE_ACCOUNT_JSON_BASE64: str
    OPENROUTER_API_KEY: str

    DB_SSL_CERT_PATH: str = "/app/core/certs/supabase-ca.pem"

    OPENROUTER_MODEL: str = "deepseek/deepseek-r1-0528:free"

    @property
    def REDIS_URL(self) -> str:
        if os.getenv("DOCKER_CONTAINER") or self.ENVIRONMENT.lower() == "production":
            return self.REDIS_URL_DOCKER
        else:
            return self.REDIS_URL_LOCAL

    @property
    def DATABASE_URL(self) -> str:
        """Return appropriate database URL based on environment"""
        # --- Testing Environment ---
        if self.ENVIRONMENT.lower() == "testing":
            return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB_TEST}"
        
        # --- Production Environment (Supabase with SSL) ---
        if self.ENVIRONMENT.lower() == "production":
            if not self.PRODUCTION_DATABASE_URL:
                raise ValueError("PRODUCTION_DATABASE_URL must be set in production environment")
            
            base_url = self.PRODUCTION_DATABASE_URL
            
            if "sslmode" not in base_url:
                return f"{base_url}?sslmode=require"
            return base_url
        
        # --- Local Development Environment ---
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def FIREBASE_CREDENTIALS(self) -> dict:
        try:
            decoded_str = base64.b64decode(self.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64)
            return json.loads(decoded_str)
        except (ValueError, TypeError):
            print("WARNING: Could not decode FIREBASE_SERVICE_ACCOUNT_JSON_BASE64. Using dummy credentials.")
            return {"type": "service_account", "project_id": "development"}

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"
        
settings = Settings()