from typing import List, Dict, Any

class ConversationMemory:
    """
    Manages conversational context in memory.
    """
    def __init__(self):
        self.history: List[Dict[str, str]] = []

    def add_message(self, role: str, content: str):
        self.history.append({"role": role, "content": content})

    def get_messages(self, limit: int = 10) -> List[Dict[str, str]]:
        return self.history[-limit:]

    def clear(self):
        self.history.clear()
