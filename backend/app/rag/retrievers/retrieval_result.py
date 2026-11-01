from pydantic import BaseModel
from typing import Dict, Any, Optional

class RetrievalResult(BaseModel):
    chunk_text: str
    document_name: str
    page_number: int
    section: str
    similarity_score: float
    rerank_score: float
    metadata: Dict[str, Any]
