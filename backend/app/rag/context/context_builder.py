import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ContextBuilder:
    @staticmethod
    def build_context(retrieved_chunks: List[Dict[str, Any]], relations: List[Dict[str, Any]] = None) -> str:
        """
        Synthesizes retrieved chunks and optional concept relations into a unified prompt context.
        """
        context_text = ""
        for r in retrieved_chunks:
            context_text += f"\n--- Source File: {r['filename']} (Page {r.get('page', 1)}, Section: {r.get('section', 'General Content')}) ---\n{r['content']}\n"
            
        if relations:
            context_text += "\n--- SYSTEM CONCEPT RELATIONSHIPS ---\n"
            for rel in relations[:15]:
                context_text += f"- {rel['subject']} -> {rel['predicate']} -> {rel['object']}\n"
                
        return context_text
