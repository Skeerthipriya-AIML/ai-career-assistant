import os
from typing import Dict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_prompt(category: str, name: str) -> str:
    """
    Loads prompt text template dynamically from the respective files.
    category: e.g. 'chat', 'agent', 'interview', 'document'
    name: e.g. 'system', 'rag', 'planner', 'reflection', 'hr', 'technical', 'summary'
    """
    file_path = os.path.join(BASE_DIR, category, f"{name}.txt")
    if not os.path.exists(file_path):
        fallbacks: Dict[str, Dict[str, str]] = {
            "chat": {
                "system": "You are an intelligent Career RAG Chatbot. Cite source documents clearly.",
                "rag": "Rewrite the query to make it search-friendly. Respond with rewritten text only."
            },
            "agent": {
                "planner": "Break down request into roadmap checklist steps.",
                "reflection": "Determine if complete, retry if needed. Return JSON."
            },
            "interview": {
                "hr": "Generate HR interview question.",
                "technical": "Generate technical question with boilerplate."
            },
            "document": {
                "summary": "Summarize the document text highlights."
            }
        }
        return fallbacks.get(category, {}).get(name, "Default AI Career Assistant Prompt.")
    
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read().strip()
