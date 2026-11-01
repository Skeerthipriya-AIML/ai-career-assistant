import logging
from typing import Dict, Any
from datetime import datetime, timedelta
from app.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)

class HistoryRepository(BaseRepository):
    def __init__(self):
        super().__init__("login_history")

    async def log_login_attempt(self, email: str, client_ip: str, user_agent: str, success: bool):
        doc = {
            "email": email,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "success": success,
            "timestamp": datetime.utcnow()
        }
        await self.collection.insert_one(doc)
        logger.info(f"Logged login attempt for email={email} success={success} ip={client_ip}")

    async def count_recent_failures(self, email: str, minutes: int = 15) -> int:
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        query = {
            "email": email,
            "success": False,
            "timestamp": {"$gte": cutoff}
        }
        last_success = await self.collection.find_one(
            {"email": email, "success": True},
            sort=[("timestamp", -1)]
        )
        if last_success:
            query["timestamp"]["$gt"] = last_success["timestamp"]
            
        return await self.collection.count_documents(query)

history_repo = HistoryRepository()
