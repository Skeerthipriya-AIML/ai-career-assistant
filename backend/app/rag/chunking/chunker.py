import os
import logging
from typing import List, Dict, Any, Tuple
import pypdf
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

class Chunker:
    @staticmethod
    def chunk_document(
        user_id: str,
        filename: str,
        file_path: str,
        text: str,
        parent_metadata: Dict[str, Any],
        chunk_size: int = 600,
        chunk_overlap: int = 120
    ) -> Tuple[List[str], List[Dict[str, Any]]]:
        """
        Splits document content into smart semantic chunks reinforced with parent metadata.
        For PDFs, splits are page-aware.
        """
        splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        chunks = []
        chunk_metadatas = []
        
        ext = os.path.splitext(filename)[1].lower()
        
        # Parent Reinforcement attributes
        reinforced_meta = {
            "user_id": user_id,
            "filename": filename,
            "language": parent_metadata.get("language", "en"),
            "file_type": parent_metadata.get("file_type", "TXT"),
            "domains": ",".join(parent_metadata.get("detected_domains", ["General"]))
        }

        if ext == ".pdf" and os.path.exists(file_path):
            try:
                reader = pypdf.PdfReader(file_path)
                for page_idx, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        page_chunks = splitter.split_text(page_text)
                        for chunk_idx, chk in enumerate(page_chunks):
                            chunks.append(chk)
                            meta = reinforced_meta.copy()
                            meta.update({
                                "page": page_idx + 1,
                                "section": f"Page {page_idx + 1}",
                                "chunk_index": len(chunks) - 1
                            })
                            chunk_metadatas.append(meta)
            except Exception as e:
                logger.warning(f"Page-aware PDF chunking failed: {e}. Falling back to standard split.")
                
        # If chunks are empty (not a PDF, or PDF extraction failed)
        if not chunks:
            raw_chunks = splitter.split_text(text)
            for idx, chk in enumerate(raw_chunks):
                chunks.append(chk)
                meta = reinforced_meta.copy()
                meta.update({
                    "page": 1,
                    "section": "General Content",
                    "chunk_index": idx
                })
                chunk_metadatas.append(meta)
                
        return chunks, chunk_metadatas
