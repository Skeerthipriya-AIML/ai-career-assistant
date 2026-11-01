import logging
from typing import List
from app.ai import embeddings
from app.rag.cache.rag_cache import rag_cache

logger = logging.getLogger(__name__)

class EmbeddingEngine:
    @staticmethod
    def get_embeddings(texts: List[str]) -> List[List[float]]:
        results = []
        texts_to_embed = []
        indices_to_embed = []
        
        for idx, text in enumerate(texts):
            cached = rag_cache.get_embedding(text)
            if cached:
                results.append((idx, cached))
            else:
                texts_to_embed.append(text)
                indices_to_embed.append(idx)
                
        if texts_to_embed:
            try:
                new_embeds = embeddings.get_embeddings(texts_to_embed)
                for new_idx, text, embed in zip(indices_to_embed, texts_to_embed, new_embeds):
                    rag_cache.set_embedding(text, embed)
                    results.append((new_idx, embed))
            except Exception as e:
                logger.error(f"Embedding engine failed to generate: {e}")
                import random
                for new_idx, text in zip(indices_to_embed, texts_to_embed):
                    mock_vec = [random.uniform(-0.1, 0.1) for _ in range(384)]
                    results.append((new_idx, mock_vec))
                    
        results = sorted(results, key=lambda x: x[0])
        return [item[1] for item in results]
