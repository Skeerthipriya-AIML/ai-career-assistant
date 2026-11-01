from typing import List, Dict, Any

class VectorMemory:
    """
    Bridges vector retrieval items to format context constraints.
    """
    @staticmethod
    def construct_memory_context(chunks: List[Dict[str, Any]]) -> str:
        if not chunks:
            return "No matching document context was found."
        
        context_parts = []
        for c in chunks:
            filename = c.get("filename", "Unknown Document")
            content = c.get("content", "")
            context_parts.append(f"Source [{filename}]:\n{content}")
            
        return "\n\n".join(context_parts)
