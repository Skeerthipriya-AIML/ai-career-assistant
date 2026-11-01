from typing import Dict, Any, Optional
from app.repositories.base_repository import BaseRepository

class PreferencesRepository(BaseRepository):
    def __init__(self):
        super().__init__("preferences")

    async def get_preferences(self, user_id: str) -> Dict[str, Any]:
        pref = await self.collection.find_one({"user_id": user_id})
        if not pref:
            default_pref = {
                "user_id": user_id,
                "theme": "dark",
                "language": "en",
                "ai_model": "gemini-1.5-flash",
                "default_interview_type": "technical",
                "notification_settings": {"email": True, "browser": True}
            }
            await self.collection.insert_one(default_pref)
            pref = default_pref
            
        pref["id"] = str(pref["_id"])
        return pref

    async def update_preferences(self, user_id: str, data: Dict[str, Any]) -> bool:
        result = await self.collection.update_one(
            {"user_id": user_id},
            {"$set": data},
            upsert=True
        )
        return result.modified_count > 0 or result.upserted_id is not None

preferences_repo = PreferencesRepository()
