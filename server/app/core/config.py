from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from functools import lru_cache
import os

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from functools import lru_cache
from pathlib import Path

# Get the directory where this file is located
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    # Robustly load .env file regardless of where the server is started from
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE), 
        env_file_encoding='utf-8',
        extra="ignore"
    )

    # --- Core Project Settings ---
    PROJECT_NAME: str = "Reservation System"
    API_V1_STR: str = "/api/v1"
    
    # --- Security & Database ---
    DATABASE_URL: str = "sqlite:///./conference.db"
    SECRET_KEY: str = "SUPER_SECRET_KEY_CHANGE_ME"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # --- CORS (Cross-Origin Resource Sharing) ---
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:5173"
    ]

    # --- Logging ---
    LOG_LEVEL: str = "INFO"
    LOG_SAMPLING_RATE: float = 1.0

    # --- Google OAuth 2.0 ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/callback/google"
    
    # Needed for Calendar integration
    GOOGLE_CALENDAR_ID: str = "primary"

@lru_cache
def get_settings():
    return Settings()