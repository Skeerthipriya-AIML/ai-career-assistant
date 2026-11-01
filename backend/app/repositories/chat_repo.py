from typing import List, Dict, Any, Optional
from bson import ObjectId
from app.repositories.base_repository import BaseRepository

class ChatRepository(BaseRepository):
    def __init__(self):
        super().__init__("chats")

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
                "name": s["name"],
                "created_at": s["created_at"]
            })
        return sessions

    async def create(self, session_data: Dict[str, Any]) -> str:
        res = await self.collection.insert_one(session_data)
        return str(res.inserted_id)

    async def append_messages(self, session_id: str, user_id: str, chat_msg: Dict[str, Any], assistant_msg: Dict[str, Any]) -> None:
        await self.collection.update_one(
            {"_id": ObjectId(session_id), "user_id": user_id},
            {"$push": {"messages": {"$each": [chat_msg, assistant_msg]}}}
        )

chat_repo = ChatRepository()
