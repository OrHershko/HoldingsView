import base64
import json
from typing import Optional

from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Holdings View API"
    API_V1_STR: str = "/api/v1"
    
    # Environment control
    ENVIRONMENT: str = "development"

    # Local Database Configuration
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: str

    # Production Database URL (Supabase)
    PRODUCTION_DATABASE_URL: Optional[str] = None

    # CORS
    BACKEND_CORS_ORIGINS: str

    # Firebase
    FIREBASE_SERVICE_ACCOUNT_JSON_BASE64: str
    # OpenRouter
    OPENROUTER_API_KEY: str

    @property
    def DATABASE_URL(self) -> str:
        """Return appropriate database URL based on environment"""
        if self.ENVIRONMENT.lower() == "production" and self.PRODUCTION_DATABASE_URL:
            print(f"Using PRODUCTION database: {self.PRODUCTION_DATABASE_URL[:30]}...")
            return self.PRODUCTION_DATABASE_URL
        else:
            local_url = f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            print(f"Using DEVELOPMENT database: {local_url}")
            return local_url

    @property
    def FIREBASE_CREDENTIALS(self) -> dict:
        """
        Decodes the base64 encoded Firebase service account JSON.
        """
        try:
            decoded_str = base64.b64decode(self.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64)
            return json.loads(decoded_str)
        except ValueError:
            # Return dummy config for development
            return {"type": "service_account", "project_id": "development"}

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()