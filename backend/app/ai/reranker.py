from typing import List, Dict, Any
from app.ai.embeddings import get_embeddings

def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculates cosine similarity between two float vectors.
    """
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = sum(a * a for a in vec1) ** 0.5
    norm_b = sum(b * b for b in vec2) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def rerank_documents(
    query_vector: List[float], 
    docs: List[str], 
    metadatas: List[Dict[str, Any]], 
    ids: List[str], 
    normalized_bm25: List[float],
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Reranks document chunks using hybrid vector similarity and BM25 scores.
    """
    reranked_results = []
    for idx, (doc, meta, doc_id) in enumerate(zip(docs, metadatas, ids)):
        chunk_embedding = get_embeddings([doc])[0]
        vector_score = calculate_cosine_similarity(query_vector, chunk_embedding)
        
        lexical_score = normalized_bm25[idx]
        
        # Hybrid combined confidence calculation: 60% semantic + 40% lexical keyword overlap
        hybrid_score = (0.6 * vector_score) + (0.4 * lexical_score)
        
        reranked_results.append({
            "id": doc_id,
            "content": doc,
            "document_id": meta.get("document_id"),
            "filename": meta.get("filename", "Unknown Document"),
            "chunk_index": meta.get("chunk_index", 0),
            "page": meta.get("page", 1),
            "section": meta.get("section", "General Content"),
            "confidence": round(hybrid_score, 3)
        })
        
    reranked_results.sort(key=lambda x: x["confidence"], reverse=True)
    return reranked_results[:top_k]
