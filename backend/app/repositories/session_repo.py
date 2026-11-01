from typing import List, Dict, Any, Optional
from datetime import datetime
from bson import ObjectId
from app.repositories.base_repository import BaseRepository

class SessionRepository(BaseRepository):
    def __init__(self):
        super().__init__("sessions")

    async def create_session(
        self,
        user_id: str,
        user_agent: str,
        client_ip: str,
        expires_at: datetime
    ) -> str:
        doc = {
            "user_id": user_id,
            "user_agent": user_agent,
            "client_ip": client_ip,
            "is_revoked": False,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at
        }
        result = await self.collection.insert_one(doc)
        return str(result.inserted_id)

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(session_id)})
            if doc:
                doc["id"] = str(doc["_id"])
                doc["_id"] = str(doc["_id"])
                return doc
        except Exception:
            pass
        return None

    async def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id, "is_revoked": False})
        sessions = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            doc["_id"] = str(doc["_id"])
            sessions.append(doc)
        return sessions

    async def revoke_session(self, session_id: str) -> bool:
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {"is_revoked": True}}
            )
            return result.modified_count > 0
        except Exception:
            return False

    async def revoke_all_user_sessions(self, user_id: str) -> int:
        result = await self.collection.update_many(
            {"user_id": user_id, "is_revoked": False},
            {"$set": {"is_revoked": True}}
        )
        return result.modified_count

    async def delete_expired_sessions(self) -> int:
        now = datetime.utcnow()
        result = await self.collection.delete_many({"expires_at": {"$lt": now}})
        return result.deleted_count

session_repo = SessionRepository()
