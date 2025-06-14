import base64
import json
from typing import List, Union

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Holdings View API"
    API_V1_STR: str = "/api/v1"

    # Database
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: str
    DATABASE_URL: str

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = []

    # Firebase
    FIREBASE_SERVICE_ACCOUNT_JSON_BASE64: str

    @property
    def FIREBASE_CREDENTIALS(self) -> dict:
        """
        Decodes the base64 encoded Firebase service account JSON.
        """
        try:
            decoded_str = base64.b64decode(self.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64)
            return json.loads(decoded_str)
        except (json.JSONDecodeError, ValueError) as e:
            raise ValueError(f"Invalid Firebase service account JSON: {e}") from e

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()