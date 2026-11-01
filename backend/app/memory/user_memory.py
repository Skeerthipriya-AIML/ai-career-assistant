from typing import Dict, Any, Optional

class UserMemory:
    """
    Maintains cached user preferences and profile parameters in memory.
    """
    def __init__(self):
        self._user_context: Dict[str, Dict[str, Any]] = {}

    def update_user_context(self, user_id: str, context: Dict[str, Any]):
        if user_id not in self._user_context:
            self._user_context[user_id] = {}
        self._user_context[user_id].update(context)

    def get_user_context(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self._user_context.get(user_id)

    def clear_user_context(self, user_id: str):
        if user_id in self._user_context:
            del self._user_context[user_id]
