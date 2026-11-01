import os
import re
import logging
import json
from datetime import datetime
from typing import Dict, Any

from app.core.scanner import VirusScanner
from app.repositories.document_repo import document_repo
from app.rag.loaders.file_loader import FileLoader
from app.rag.processors.doc_processor import DocumentProcessor
from app.rag.chunking.chunker import Chunker
from app.rag.embeddings.embedding_engine import EmbeddingEngine
from app.rag.vector_store.chroma_store import ChromaStore
from app.rag.knowledge.graph_service import GraphService
from app.ai import llm

logger = logging.getLogger(__name__)

class IngestionPipeline:
    @staticmethod
    async def run(user_id: str, filename: str, file_path: str) -> Dict[str, Any]:
        """
        Executes the ingestion pipeline.
        """
        with open(file_path, "rb") as f:
            file_bytes = f.read()

        # 1. Antivirus compliance check
        if not VirusScanner.scan(file_bytes):
            raise ValueError("Malware signature detected. Ingest terminated.")

        # 2. File fingerprint & Deduplication
        fingerprint = VirusScanner.get_fingerprint(file_bytes)
        existing_dup = await DocumentProcessor.check_duplicate(user_id, fingerprint)
        if existing_dup:
            raise ValueError("Duplicate upload detected. This document is already indexed.")

        # 3. Versioning offset
        db = document_repo.collection.database
        existing_name = await db["documents"].find_one({"user_id": user_id, "filename": filename})
        version = 1
        if existing_name:
            version = existing_name.get("version", 1) + 1
            base, ext = os.path.splitext(filename)
            filename = f"{base}_v{version}{ext}"

        # 4. Extract Text Content (with easyocr fallback)
        text = FileLoader.extract_text(file_path, filename)
        if not text.strip():
            raise ValueError("No readable characters identified inside document.")

        # 5. Metadata & Language Detection
        doc_metadata = await DocumentProcessor.extract_metadata(text, filename)
        
        # 6. Smart semantic chunking with parent reinforcement
        chunks, chunk_metadatas = Chunker.chunk_document(
            user_id=user_id,
            filename=filename,
            file_path=file_path,
            text=text,
            parent_metadata=doc_metadata
        )
        if not chunks:
            raise ValueError("Smart splitter produced zero content chunks.")

        # 7. Similar document detection
        similar_doc = await DocumentProcessor.detect_similar_documents(user_id, chunks[0])
        if similar_doc:
            logger.info(f"High similarity document detected: '{similar_doc['filename']}' ({similar_doc['similarity'] * 100:.1f}%)")

        # 8. Create MongoDB Document Entry
        doc_record = {
            "user_id": user_id,
            "filename": filename,
            "filepath": file_path,
            "fingerprint": fingerprint,
            "version": version,
            "uploaded_at": datetime.utcnow(),
            "chunks_count": len(chunks),
            "is_favorite": False,
            "tags": doc_metadata.get("detected_domains", ["General"]),
            "summary": "Processing summary details...",
            "language": doc_metadata.get("language", "en"),
            "word_count": doc_metadata.get("word_count", 0),
            "similar_document": similar_doc.get("filename") if similar_doc else None
        }
        
        document_id = await document_repo.create(doc_record)

        # 9. Embed and Index vectors
        embeddings_list = EmbeddingEngine.get_embeddings(chunks)
        await ChromaStore.add_documents(
            user_id=user_id,
            document_id=document_id,
            chunks=chunks,
            embeddings=embeddings_list,
            metadatas=chunk_metadatas
        )

        # 10. AI Auto summary and auto tagging
        try:
            summary_prompt = (
                "Analyze this document snippet and extract a 2-sentence summary and "
                "a list of 3-5 tags representing the content. Format the response strictly as "
                "a JSON object with keys 'summary' and 'tags'. No extra markdown styling.\n\n"
                f"Snippet:\n{text[:2500]}"
            )
            llm_res = await llm.chat_completion(
                messages=[{"role": "user", "content": summary_prompt}],
                temperature=0.2
            )
            
            clean_res = re.search(r"\{.*\}", llm_res.replace("\n", ""), re.DOTALL)
            if clean_res:
                parsed = json.loads(clean_res.group(0))
                await db["documents"].update_one(
                    {"_id": doc_record["_id"] if "_id" in doc_record else None},
                    {"$set": {
                        "summary": parsed.get("summary", "Document parsed successfully."),
                        "tags": parsed.get("tags", doc_metadata.get("detected_domains", ["General"]))
                      }}
                )
        except Exception as ai_err:
            logger.warning(f"Failed to generate tags/summary: {ai_err}")

        # 11. Compile Knowledge Graph connections using GraphService
        await GraphService.extract_and_index_relations(user_id, document_id, text)

        return {
            "id": document_id,
            "filename": filename,
            "chunks_count": len(chunks),
            "version": version
        }
