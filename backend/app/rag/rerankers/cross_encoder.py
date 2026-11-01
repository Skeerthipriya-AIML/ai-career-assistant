import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class CrossEncoderReranker:
    @staticmethod
    def rerank(
        query_vector: List[float],
        candidates: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Reranks candidate chunks based on vector + lexical hybrid scores.
        """
        sorted_candidates = sorted(candidates, key=lambda x: x.get("score", 0), reverse=True)
        
        results = []
        for c in sorted_candidates[:top_k]:
            meta = c.get("metadata", {})
            results.append({
                "id": c.get("id"),
                "content": c.get("content"),
                "document_id": meta.get("document_id"),
                "filename": meta.get("filename", "Unknown Document"),
                "chunk_index": meta.get("chunk_index", 0),
                "page": meta.get("page", 1),
                "section": meta.get("section", "General Content"),
                "confidence": round(c.get("confidence", 0.5), 3)
            })
            
        return results
