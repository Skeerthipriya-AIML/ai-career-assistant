import pytest
import sys
import os

# Adjust import paths for tests
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import get_password_hash, verify_password
from app.agents.agent_service import AgentService
from app.rag.pipeline.retrieval_pipeline import RetrievalPipeline as RAGService
from app.ai.embeddings import get_embeddings

class LLMService:
    @staticmethod
    def get_embeddings(texts):
        return get_embeddings(texts)

def test_password_hashing():
    """
    Validates bcrypt password hashing and verification match.
    """
    raw_password = "supersecretpassword123"
    hashed = get_password_hash(raw_password)
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_local_embeddings():
    """
    Validates that our local embedding model creates dense vector embeddings.
    """
    texts = ["How to improve resume for software engineering?", "RAG vector retrieval indexing checks."]
    embeddings = LLMService.get_embeddings(texts)
    assert len(embeddings) == 2
    assert len(embeddings[0]) == 384  # bge-small returns 384 dimensions

def test_agent_calculator_tool():
    """
    Verifies that the Agent Tool executor can run arithmetic calculations securely.
    """
    calc_expr = "23 * 4 + 10"
    result = AgentService.run_tool("Calculator", calc_expr)
    assert result == "102"

def test_agent_weather_tool():
    """
    Checks that the weather API returns coordinates information or fallback string.
    """
    res = AgentService.run_tool("Weather Tool", "tokyo")
    assert "tokyo" in res.lower() or "weather" in res.lower()

def test_query_rewriting():
    """
    Ensures query rewriting executes and doesn't crash on standard queries.
    """
    import asyncio
    query = "fastapi rag help"
    loop = asyncio.get_event_loop()
    rewritten = loop.run_until_complete(RAGService.rewrite_query(query))
    assert isinstance(rewritten, str)
    assert len(rewritten) > 0
