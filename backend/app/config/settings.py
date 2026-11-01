import os
from app.config import database, security, ai, constants

class Settings:
    PROJECT_NAME: str = constants.PROJECT_NAME
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # DB
    MONGODB_URI: str = database.MONGODB_URI
    CHROMA_DB_PATH: str = database.CHROMA_DB_PATH
    
    # Security
    JWT_SECRET: str = security.JWT_SECRET
    JWT_ALGORITHM: str = security.JWT_ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES: int = security.ACCESS_TOKEN_EXPIRE_MINUTES
    GOOGLE_CLIENT_ID: str = security.GOOGLE_CLIENT_ID
    GITHUB_CLIENT_ID: str = security.GITHUB_CLIENT_ID
    
    # AI
    HUGGINGFACEHUB_API_TOKEN: str = ai.HUGGINGFACEHUB_API_TOKEN
    CHAT_MODEL_NAME: str = ai.CHAT_MODEL_NAME
    EMBEDDING_MODEL_NAME: str = ai.EMBEDDING_MODEL_NAME
    SPEECH_MODEL_NAME: str = ai.SPEECH_MODEL_NAME
    
    # Constants
    UPLOAD_DIR: str = constants.UPLOAD_DIR

settings = Settings()
