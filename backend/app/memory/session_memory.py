from typing import Dict, Any, Optional

class SessionMemory:
    """
    Manages active user session states in memory.
    """
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self.sessions.get(session_id)

    def set_session_value(self, session_id: str, key: str, value: Any):
        if session_id not in self.sessions:
            self.sessions[session_id] = {}
        self.sessions[session_id][key] = value

    def clear_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
