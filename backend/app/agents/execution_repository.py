from typing import List, Dict, Any, Optional
from bson import ObjectId
from app.repositories.base_repository import BaseRepository

class ExecutionRepository(BaseRepository):
    def __init__(self):
        super().__init__("agent_executions")

    async def create_execution(self, user_id: str, prompt: str, initial_record: Dict[str, Any]) -> str:
        record = {
            "user_id": user_id,
            "prompt": prompt,
            **initial_record
        }
        res = await self.collection.insert_one(record)
        return str(res.inserted_id)

    async def update_status(self, execution_id: str, user_id: str, status: str, update_fields: Dict[str, Any]) -> bool:
        if not ObjectId.is_valid(execution_id):
            return False
        res = await self.collection.update_one(
            {"_id": ObjectId(execution_id), "user_id": user_id},
            {"$set": {"status": status, **update_fields}}
        )
        return res.matched_count > 0

    async def get_execution(self, execution_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(execution_id):
            return None
        res = await self.collection.find_one({
            "_id": ObjectId(execution_id),
            "user_id": user_id
        })
        if res:
            res["id"] = str(res["_id"])
            del res["_id"]
        return res

execution_repo = ExecutionRepository()
