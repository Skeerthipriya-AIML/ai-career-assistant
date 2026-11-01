import logging
from typing import List
from sentence_transformers import SentenceTransformer
from app.config.config import settings

logger = logging.getLogger(__name__)

# Initialize local embedding model
try:
    logger.info(f"Initializing local SentenceTransformer embedding model ({settings.EMBEDDING_MODEL_NAME})...")
    embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
    logger.info("Embedding model loaded successfully.")
except Exception as e:
    logger.error(f"Error loading SentenceTransformer: {e}. Fallback embedding will be used.")
    embedding_model = None

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate vector embeddings locally.
    """
    if embedding_model:
        embeddings = embedding_model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()
    else:
        logger.warning("Embedding model fallback: Generating mock vectors.")
        import random
        return [[random.uniform(-0.1, 0.1) for _ in range(384)] for _ in texts]
