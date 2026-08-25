import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OCR_ENGINE: str = os.getenv("OCR_ENGINE", "tesseract")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "gemini-1.5-pro")
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "gradeai")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "gradeai-hackathon-secret-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    class Config:
        env_file = ".env"

settings = Settings()