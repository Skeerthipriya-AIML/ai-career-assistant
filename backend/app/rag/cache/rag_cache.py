import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class RAGCache:
    def __init__(self, default_ttl_sec: int = 300):
        self.default_ttl = default_ttl_sec
        self._embeddings_cache: Dict[str, tuple] = {}
        self._searches_cache: Dict[str, tuple] = {}
        self._metadata_cache: Dict[str, tuple] = {}

    def get_embedding(self, text: str) -> Optional[list]:
        if text in self._embeddings_cache:
            val, expires_at = self._embeddings_cache[text]
            if time.time() < expires_at:
                return val
            else:
                del self._embeddings_cache[text]
        return None

    def set_embedding(self, text: str, embedding: list, ttl: int = 1800):
        self._embeddings_cache[text] = (embedding, time.time() + ttl)

    def get_search(self, query_key: str) -> Optional[list]:
        if query_key in self._searches_cache:
            val, expires_at = self._searches_cache[query_key]
            if time.time() < expires_at:
                return val
            else:
                del self._searches_cache[query_key]
        return None

    def set_search(self, query_key: str, results: list, ttl: int = 300):
        self._searches_cache[query_key] = (results, time.time() + ttl)

    def get_metadata(self, doc_id: str) -> Optional[dict]:
        if doc_id in self._metadata_cache:
            val, expires_at = self._metadata_cache[doc_id]
            if time.time() < expires_at:
                return val
            else:
                del self._metadata_cache[doc_id]
        return None

    def set_metadata(self, doc_id: str, metadata: dict, ttl: int = 600):
        self._metadata_cache[doc_id] = (metadata, time.time() + ttl)

    def clear(self):
        self._embeddings_cache.clear()
        self._searches_cache.clear()
        self._metadata_cache.clear()
        logger.info("RAG Cache cleared successfully.")

rag_cache = RAGCache()
