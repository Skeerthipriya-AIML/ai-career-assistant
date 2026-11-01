import time
import logging
from typing import List, Dict, Any, Tuple, Optional
from app.rag.cache.rag_cache import rag_cache
from app.rag.retrievers.hybrid_retriever import HybridRetriever
from app.rag.retrievers.retrieval_result import RetrievalResult
from app.rag.rerankers.cross_encoder import CrossEncoderReranker
from app.rag.embeddings.embedding_engine import EmbeddingEngine
from app.ai import llm

logger = logging.getLogger(__name__)

class RetrievalPipeline:
    @staticmethod
    async def rewrite_query(query: str) -> str:
        try:
            from app.prompts.loader import load_prompt
            system_prompt = load_prompt("chat", "rag")
            rewritten = await llm.chat_completion(
                messages=[{"role": "user", "content": query}],
                system_prompt=system_prompt,
                max_tokens=100,
                temperature=0.2
            )
            return rewritten.strip().replace('"', '') or query
        except Exception as e:
            logger.error(f"Query rewrite failure: {e}")
            return query

    @classmethod
    async def run(
        cls,
        user_id: str,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 5
    ) -> Tuple[List[RetrievalResult], Dict[str, float], str]:
        """
        Executes the retrieval pipeline.
        Returns (List of RetrievalResults, Latency Metrics, Rewritten Query).
        """
        start_time = time.time()
        
        metrics = {
            "rewrite_latency_ms": 0.0,
            "embedding_latency_ms": 0.0,
            "retrieval_latency_ms": 0.0,
            "reranking_latency_ms": 0.0,
            "total_retrieval_latency_ms": 0.0
        }
        
        doc_key = ",".join(sorted(document_ids or []))
        cache_key = f"{user_id}:{query}:{doc_key}"
        cached_data = rag_cache.get_search(cache_key)
        
        if cached_data:
            logger.info("RAG Cache Hit: Retrieval search results loaded from memory.")
            results, rewritten_query = cached_data
            metrics["total_retrieval_latency_ms"] = (time.time() - start_time) * 1000
            return results, metrics, rewritten_query

        # 1. Query Rewrite
        t0 = time.time()
        rewritten_query = await cls.rewrite_query(query)
        metrics["rewrite_latency_ms"] = (time.time() - t0) * 1000

        # 2. Embed Query
        t0 = time.time()
        query_vector = EmbeddingEngine.get_embeddings([rewritten_query])[0]
        metrics["embedding_latency_ms"] = (time.time() - t0) * 1000

        # 3. Hybrid Retrieve
        t0 = time.time()
        candidates = await HybridRetriever.retrieve(
            user_id=user_id,
            query=rewritten_query,
            document_ids=document_ids,
            top_k=top_k * 2,
            expand_context=True
        )
        metrics["retrieval_latency_ms"] = (time.time() - t0) * 1000

        # 4. Cross-Encoder Rerank
        t0 = time.time()
        reranked = CrossEncoderReranker.rerank(query_vector, candidates, top_k=top_k)
        metrics["reranking_latency_ms"] = (time.time() - t0) * 1000

        results = []
        for r in reranked:
            meta = {
                "document_id": r.get("document_id"),
                "filename": r.get("filename"),
                "chunk_index": r.get("chunk_index"),
                "page": r.get("page"),
                "section": r.get("section")
            }
            results.append(RetrievalResult(
                chunk_text=r["content"],
                document_name=r.get("filename", "Unknown"),
                page_number=r.get("page", 1),
                section=r.get("section", "General Content"),
                similarity_score=r.get("confidence", 0.5),
                rerank_score=r.get("confidence", 0.5),
                metadata=meta
            ))

        rag_cache.set_search(cache_key, (results, rewritten_query))

        metrics["total_retrieval_latency_ms"] = (time.time() - start_time) * 1000
        return results, metrics, rewritten_query
