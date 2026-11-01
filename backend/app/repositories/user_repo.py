from typing import Any, Dict, Optional
from datetime import datetime
from bson import ObjectId
from app.repositories.base_repository import BaseRepository

class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__("users")

    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        user = await self.collection.find_one({"email": email})
        if user:
            user["id"] = str(user["_id"])
        return user

    async def find_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        user = await self.collection.find_one({"username": username})
        if user:
            user["id"] = str(user["_id"])
        return user

    async def find_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(user_id):
            return None
        user = await self.collection.find_one({"_id": ObjectId(user_id)})
        if user:
            user["id"] = str(user["_id"])
        return user

    async def create(self, user_data: Dict[str, Any]) -> str:
        if "created_at" not in user_data:
            user_data["created_at"] = datetime.utcnow()
        result = await self.collection.insert_one(user_data)
        return str(result.inserted_id)

    async def update_profile(self, user_id: str, profile_data: Dict[str, Any]) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": profile_data}
        )
        return result.modified_count > 0

    async def lock_account(self, email: str, lock_until: datetime) -> None:
        await self.collection.update_one(
            {"email": email},
            {"$set": {"locked_until": lock_until}}
        )

    async def mark_email_verified(self, email: str) -> None:
        await self.collection.update_one(
            {"email": email},
            {"$set": {"is_verified": True}}
        )

    async def update_password(self, user_id: str, hashed_password: str) -> None:
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password_hash": hashed_password}}
        )

    async def delete_user(self, user_id: str) -> bool:
        result = await self.collection.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0

    async def update_oauth_provider(self, user_id: str, provider: str, oauth_id: str) -> None:
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"oauth_provider": provider, "oauth_id": oauth_id}}
        )

user_repo = UserRepository()
