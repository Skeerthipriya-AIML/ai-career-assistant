from typing import List, Dict, Any, Optional
from bson import ObjectId
from app.repositories.base_repository import BaseRepository

class CoachRepository(BaseRepository):
    def __init__(self):
        super().__init__("interviews")

    async def find_by_id(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(session_id):
            return None
        return await self.collection.find_one({
            "_id": ObjectId(session_id),
            "user_id": user_id
        })

    async def list_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1)
        sessions = []
        async for s in cursor:
            sessions.append({
                "id": str(s["_id"]),
                "type": s["type"],
                "average_score": s.get("average_score", 0),
                "created_at": s["created_at"],
                "exchanges_count": len(s.get("exchanges", []))
            })
        return sessions

    async def create_session(self, session_data: Dict[str, Any]) -> str:
        res = await self.collection.insert_one(session_data)
        return str(res.inserted_id)

    async def append_exchange(self, session_id: str, user_id: str, exchange_record: Dict[str, Any]) -> None:
        await self.collection.update_one(
            {"_id": ObjectId(session_id), "user_id": user_id},
            {"$push": {"exchanges": exchange_record}}
        )

    async def update_average_score(self, session_id: str, avg_score: int) -> None:
        await self.collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"average_score": avg_score}}
        )

    async def insert_ats_record(self, ats_record: Dict[str, Any]) -> None:
        db = self.collection.database
        await db["ats_history"].insert_one(ats_record)

coach_repo = CoachRepository()
