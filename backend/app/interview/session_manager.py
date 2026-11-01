import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.repositories.coach_repo import coach_repo

logger = logging.getLogger(__name__)

class SessionManager:
    @staticmethod
    async def create_new_session(user_id: str, session_type: str) -> str:
        session_record = {
            "user_id": user_id,
            "type": session_type,
            "created_at": datetime.utcnow(),
            "exchanges": [],
            "average_score": 0
        }
        return await coach_repo.create_session(session_record)

    @staticmethod
    async def add_exchange_to_session(
        session_id: str,
        user_id: str,
        exchange: Dict[str, Any]
    ) -> None:
        await coach_repo.append_exchange(session_id, user_id, exchange)
        
        session = await coach_repo.find_by_id(session_id, user_id)
        if session and session.get("exchanges"):
            scores = [ex["score"] for ex in session["exchanges"]]
            avg_score = int(sum(scores) / len(scores))
            await coach_repo.update_average_score(session_id, avg_score)

    @staticmethod
    async def get_session_history(session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        return await coach_repo.find_by_id(session_id, user_id)

    @staticmethod
    async def list_user_sessions(user_id: str) -> List[Dict[str, Any]]:
        return await coach_repo.list_by_user(user_id)
