import os

HUGGINGFACEHUB_API_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN", "")
CHAT_MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"
EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"
SPEECH_MODEL_NAME = "openai/whisper-large-v3"
