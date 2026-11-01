from typing import Dict, Any, Optional
from datetime import datetime
from bson import ObjectId
from app.repositories.base_repository import BaseRepository

class TokenRepository(BaseRepository):
    def __init__(self):
        super().__init__("refresh_tokens")

    # --- Refresh Tokens ---
    async def save_refresh_token(
        self,
        token_hash: str,
        user_id: str,
        session_id: str,
        expires_at: datetime
    ) -> str:
        doc = {
            "token_hash": token_hash,
            "user_id": user_id,
            "session_id": session_id,
            "is_rotated": False,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at
        }
        result = await self.collection.insert_one(doc)
        return str(result.inserted_id)

    async def get_refresh_token(self, token_hash: str) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one({"token_hash": token_hash})
        if doc:
            doc["id"] = str(doc["_id"])
        return doc

    async def mark_token_rotated(self, token_id: str):
        await self.collection.update_one(
            {"_id": ObjectId(token_id)},
            {"$set": {"is_rotated": True}}
        )

    async def revoke_tokens_by_session(self, session_id: str):
        await self.collection.delete_many({"session_id": session_id})

    # --- Email Verification Tokens ---
    async def save_verification_code(self, email: str, code_hash: str, expires_at: datetime):
        db = self.collection.database
        coll = db["email_verification_tokens"]
        await coll.update_one(
            {"email": email},
            {
                "$set": {
                    "code_hash": code_hash,
                    "expires_at": expires_at,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )

    async def get_verification_code(self, code_hash: str) -> Optional[Dict[str, Any]]:
        db = self.collection.database
        coll = db["email_verification_tokens"]
        return await coll.find_one({"code_hash": code_hash})

    async def delete_verification_code(self, email: str):
        db = self.collection.database
        coll = db["email_verification_tokens"]
        await coll.delete_one({"email": email})

    # --- Password Reset Tokens ---
    async def save_reset_code(self, email: str, code_hash: str, expires_at: datetime):
        db = self.collection.database
        coll = db["password_reset_tokens"]
        await coll.update_one(
            {"email": email},
            {
                "$set": {
                    "code_hash": code_hash,
                    "expires_at": expires_at,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )

    async def get_reset_code(self, code_hash: str) -> Optional[Dict[str, Any]]:
        db = self.collection.database
        coll = db["password_reset_tokens"]
        return await coll.find_one({"code_hash": code_hash})

    async def delete_reset_code(self, email: str):
        db = self.collection.database
        coll = db["password_reset_tokens"]
        await coll.delete_one({"email": email})

token_repo = TokenRepository()
