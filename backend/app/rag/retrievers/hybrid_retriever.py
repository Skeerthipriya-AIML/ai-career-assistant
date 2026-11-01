import re
import logging
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi
from app.rag.vector_store.chroma_store import ChromaStore
from app.rag.embeddings.embedding_engine import EmbeddingEngine

logger = logging.getLogger(__name__)

class HybridRetriever:
    @staticmethod
    async def retrieve(
        user_id: str,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 5,
        expand_context: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Retrieves matching chunks across selected documents using hybrid (Vector + BM25) search.
        If expand_context is True, retrieves neighborhood chunks for context expansion.
        """
        collection = ChromaStore.get_collection(user_id)
        
        # Embed query
        query_vector = EmbeddingEngine.get_embeddings([query])[0]
        
        # Filter metadata
        where_filter: Dict[str, Any] = {}
        if document_ids and len(document_ids) > 0:
            if len(document_ids) == 1:
                where_filter = {"document_id": document_ids[0]}
            else:
                where_filter = {"$or": [{"document_id": doc_id} for doc_id in document_ids]}

        # Query ChromaDB (retrieve candidates first)
        n_candidates = max(20, top_k * 3)
        vector_results = collection.query(
            query_embeddings=[query_vector],
            n_results=n_candidates,
            where=where_filter if where_filter else None
        )

        if not vector_results or not vector_results["ids"] or not vector_results["ids"][0]:
            return []

        retrieved_docs = vector_results["documents"][0]
        retrieved_metadatas = vector_results["metadatas"][0]
        retrieved_ids = vector_results["ids"][0]

        # BM25 Search
        def tokenize(text):
            return re.findall(r'\w+', text.lower())

        tokenized_corpus = [tokenize(doc) for doc in retrieved_docs]
        tokenized_query = tokenize(query)

        bm25_scores = [0.0] * len(retrieved_docs)
        if tokenized_corpus and tokenized_query:
            try:
                bm25 = BM25Okapi(tokenized_corpus)
                bm25_scores = bm25.get_scores(tokenized_query)
            except Exception as e:
                logger.warning(f"BM25 calculations error: {e}")

        # Normalize BM25
        max_bm25 = max(bm25_scores) if len(bm25_scores) > 0 and max(bm25_scores) > 0 else 1.0
        normalized_bm25 = [score / max_bm25 for score in bm25_scores]

        # Combine results: similarity + bm25
        candidates = []
        for i in range(len(retrieved_docs)):
            dist = vector_results["distances"][0][i] if vector_results["distances"] else 1.0
            # Convert L2 distance to cosine-like similarity
            cosine_similarity = 1.0 - (dist / 2.0)
            
            # Combine scores (50% vector similarity, 50% BM25 keyword score)
            combined_score = (0.5 * cosine_similarity) + (0.5 * normalized_bm25[i])
            
            candidates.append({
                "id": retrieved_ids[i],
                "content": retrieved_docs[i],
                "metadata": retrieved_metadatas[i],
                "score": combined_score,
                "confidence": max(0.1, min(0.99, cosine_similarity))
            })

        # Sort candidates
        candidates = sorted(candidates, key=lambda x: x["score"], reverse=True)[:top_k]

        # Apply Context Expansion if requested
        if expand_context:
            expanded_results = []
            for item in candidates:
                meta = item["metadata"]
                doc_id = meta.get("document_id")
                chunk_idx = meta.get("chunk_index")
                
                expanded_content = item["content"]
                
                # Fetch sibling chunks from Chroma
                siblings = []
                if doc_id and chunk_idx is not None:
                    sibling_ids = [
                        f"{doc_id}_{chunk_idx - 1}",
                        f"{doc_id}_{chunk_idx + 1}"
                    ]
                    try:
                        sib_data = collection.get(ids=sibling_ids)
                        if sib_data and sib_data["documents"]:
                            for sib_doc, sib_meta in zip(sib_data["documents"], sib_data["metadatas"]):
                                sib_idx = sib_meta.get("chunk_index", 0)
                                siblings.append((sib_idx, sib_doc))
                    except Exception as e:
                        logger.warning(f"Could not retrieve neighbor chunks: {e}")
                
                # Sort siblings by index and append/prepend to content
                siblings = sorted(siblings, key=lambda x: x[0])
                for idx, text in siblings:
                    if idx < chunk_idx:
                        expanded_content = text + "\n[... Context Expansion Boundary ...]\n" + expanded_content
                    else:
                        expanded_content = expanded_content + "\n[... Context Expansion Boundary ...]\n" + text
                
                item["content"] = expanded_content
                expanded_results.append(item)
            return expanded_results

        return candidates
