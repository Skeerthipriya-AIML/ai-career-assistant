from app.config.config import settings

def get_chat_model_name() -> str:
    return settings.CHAT_MODEL_NAME

def get_embedding_model_name() -> str:
    return settings.EMBEDDING_MODEL_NAME
