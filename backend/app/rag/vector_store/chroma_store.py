import logging
from typing import List, Dict, Any, Optional
from app.database.connection import get_chromadb

logger = logging.getLogger(__name__)

class ChromaStore:
    @staticmethod
    def get_collection(user_id: str):
        chroma = get_chromadb()
        return chroma.get_or_create_collection(name=f"user_docs_{user_id}")

    @classmethod
    async def add_documents(
        cls,
        user_id: str,
        document_id: str,
        chunks: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]]
    ):
        """
        Inserts vector points and document chunks into ChromaDB collection.
        """
        collection = cls.get_collection(user_id)
        ids = [f"{document_id}_{i}" for i in range(len(chunks))]
        
        # Ensure document_id is attached to metadatas
        for meta in metadatas:
            meta["document_id"] = document_id
            
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas
        )
        logger.info(f"Added {len(chunks)} chunks to Chroma vector store for document {document_id}")

    @classmethod
    async def delete_document(cls, user_id: str, document_id: str):
        """
        Removes vector points matching document_id from user's Chroma collection.
        """
        collection = cls.get_collection(user_id)
        try:
            collection.delete(where={"document_id": document_id})
            logger.info(f"Deleted vector chunks for document {document_id} from Chroma store")
        except Exception as e:
            logger.error(f"Failed to delete document {document_id} vectors: {e}")
            raise e
