from typing import List, Dict, Any
from datetime import datetime
from bson import ObjectId
from app.repositories.base_repository import BaseRepository

class NotificationRepository(BaseRepository):
    def __init__(self):
        super().__init__("notifications")

    async def list_by_user(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        cursor = self.collection.find({
            "$or": [
                {"user_id": user_id},
                {"user_id": "all"}
            ]
        }).sort("created_at", -1).limit(limit)
        
        notifications = []
        async for n in cursor:
            notifications.append({
                "id": str(n["_id"]),
                "text": n["text"],
                "type": n["type"],
                "is_read": n.get("is_read", False),
                "created_at": n["created_at"]
            })
        return notifications

    async def create(self, user_id: str, text: str, notification_type: str) -> str:
        record = {
            "user_id": user_id,
            "text": text,
            "type": notification_type,
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        res = await self.collection.insert_one(record)
        return str(res.inserted_id)

    async def mark_read(self, notification_id: str, user_id: str) -> bool:
        if not ObjectId.is_valid(notification_id):
            return False
        res = await self.collection.update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {"$set": {"is_read": True}}
        )
        return res.modified_count > 0

    async def mark_all_read(self, user_id: str) -> int:
        res = await self.collection.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True}}
        )
        return res.modified_count

notification_repo = NotificationRepository()
