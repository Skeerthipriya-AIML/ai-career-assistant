import os

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/ai_career_assistant")
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
