import logging
from typing import List, Dict, Any, Tuple, AsyncGenerator
from app.rag.retrievers.retrieval_result import RetrievalResult
from app.rag.context.context_builder import ContextBuilder
from app.rag.citations.citation_engine import CitationEngine
from app.rag.knowledge.graph_service import GraphService
from app.ai.llm import chat_completion_stream

logger = logging.getLogger(__name__)

class GenerationPipeline:
    @staticmethod
    async def run(
        user_id: str,
        query: str,
        retrieved_results: List[RetrievalResult]
    ) -> Tuple[str, AsyncGenerator[str, None], List[Dict[str, Any]]]:
        """
        Coordinates context builder and streams completions from the LLM.
        Returns: (System Prompt, Token Stream, Citations).
        """
        relations = await GraphService.get_relationships(user_id)
        
        chunks_data = []
        for r in retrieved_results:
            chunks_data.append({
                "content": r.chunk_text,
                "filename": r.document_name,
                "page": r.page_number,
                "section": r.section,
                "confidence": r.rerank_score
            })
            
        context_text = ContextBuilder.build_context(chunks_data, relations)
        citations = CitationEngine.compile_citations(chunks_data)
        
        system_prompt = (
            "You are an expert AI Career & Technology Assistant. "
            "Your task is to answer user queries accurately, deeply, and comprehensively.\n"
            "- When retrieved document context is provided below, analyze and cite the source documents clearly (document name, page, section).\n"
            "- If the user asks for clarification, real-world examples, genuine industry sources, or broader explanations, "
            "provide a complete, well-structured breakdown with concrete code/architecture examples and verified citations (e.g., Google DeepMind, OpenAI, Meta, PyTorch, IEEE).\n"
            "- Ensure explanations are thorough, educational, and actionable for engineering students and professionals.\n\n"
            f"--- RETRIEVED CONTEXT ---{context_text}\n"
        )
        
        messages = [{"role": "user", "content": query}]
        token_stream = chat_completion_stream(
            messages=messages,
            system_prompt=system_prompt,
            temperature=0.4
        )
        
        return system_prompt, token_stream, citations
