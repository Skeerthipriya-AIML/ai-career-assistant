import os
import logging
import hashlib
from typing import Dict, Any, List, Optional
from app.repositories.document_repo import document_repo
from app.database.connection import get_chromadb
from app.ai import embeddings

logger = logging.getLogger(__name__)

class DocumentProcessor:
    @staticmethod
    def detect_language(text: str) -> str:
        """
        Detects language from text using langdetect library or simple regex fallback.
        """
        if not text or not text.strip():
            return "en"
        try:
            from langdetect import detect
            return detect(text)
        except Exception:
            # Fallback stop words check
            common_en = {"the", "and", "to", "of", "a", "in", "is", "that", "it"}
            words = set(text.lower().split()[:200])
            if words.intersection(common_en):
                return "en"
            return "en" # Default fallback

    @staticmethod
    def get_content_hash(text: str) -> str:
        """
        Generates content hash for quick duplicate checking.
        """
        return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()

    @staticmethod
    async def check_duplicate(user_id: str, fingerprint: str) -> Optional[Dict[str, Any]]:
        """
        Checks if a document with the same fingerprint already exists for this user.
        """
        db = document_repo.collection.database
        return await db["documents"].find_one({"user_id": user_id, "fingerprint": fingerprint})

    @staticmethod
    async def detect_similar_documents(user_id: str, first_chunk_text: str, threshold: float = 0.92) -> Optional[Dict[str, Any]]:
        """
        Queries Chroma for high-similarity matches on the first chunk of a new document
        to detect if a highly similar document has already been indexed.
        """
        try:
            chroma = get_chromadb()
            collection = chroma.get_or_create_collection(name=f"user_docs_{user_id}")
            
            # Embed the chunk
            query_vector = embeddings.get_embeddings([first_chunk_text])[0]
            
            # Search Chroma
            results = collection.query(
                query_embeddings=[query_vector],
                n_results=1
            )
            
            if results and results["distances"] and results["distances"][0]:
                dist = results["distances"][0][0]
                similarity = 1.0 - (dist / 2.0)
                if similarity >= threshold:
                    metadata = results["metadatas"][0][0]
                    return {
                        "filename": metadata.get("filename"),
                        "document_id": metadata.get("document_id"),
                        "similarity": similarity
                    }
        except Exception as e:
            logger.warning(f"Failed to detect similar documents: {e}")
        return None

    @staticmethod
    async def extract_metadata(text: str, filename: str) -> Dict[str, Any]:
        """
        Analyzes the text to extract core topics, estimated reading time, and target domain tags.
        """
        ext = os.path.splitext(filename)[1].lower()
        word_count = len(text.split())
        reading_time_min = max(1, round(word_count / 200))
        
        # Simple rule-based domain tagging based on keyword checks
        keywords = {
            "Software Engineering": ["react", "node", "javascript", "python", "developer", "backend", "frontend", "aws", "docker"],
            "AI / Data Science": ["machine learning", "ai", "data science", "nlp", "tensorflow", "pytorch", "embeddings", "vector", "regression"],
            "Cloud Infrastructure": ["kubernetes", "aws", "terraform", "ci/cd", "devops", "cloud", "docker", "pipeline"],
            "Business / Management": ["manager", "lead", "business", "agile", "scrum", "product", "sales", "finance"]
        }
        
        detected_domains = []
        text_lower = text.lower()
        for domain, kw_list in keywords.items():
            if any(kw in text_lower for kw in kw_list):
                detected_domains.append(domain)
                
        if not detected_domains:
            detected_domains = ["General Career"]
            
        return {
            "file_type": ext.replace(".", "").upper(),
            "word_count": word_count,
            "estimated_reading_time_min": reading_time_min,
            "detected_domains": detected_domains,
            "language": DocumentProcessor.detect_language(text)
        }
