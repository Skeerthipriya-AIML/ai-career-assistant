import logging
from typing import Dict, Any
from app.database.connection import get_mongodb

logger = logging.getLogger(__name__)

DEFAULT_FLAGS = {
    "AI_CHAT": True,
    "AI_AGENT": True,
    "DOC_ASSISTANT": True,
    "INTERVIEW_COACH": True,
    "ANALYTICS": True
}

class FeatureService:
    @staticmethod
    async def get_all_flags() -> Dict[str, bool]:
        try:
            db = get_mongodb()
            if db is not None:
                record = await db["feature_flags"].find_one({"type": "global"})
                if record:
                    flags = {k: v for k, v in record.items() if k not in ["_id", "type"]}
                    for k, v in DEFAULT_FLAGS.items():
                        if k not in flags:
                            flags[k] = v
                    return flags
                else:
                    await db["feature_flags"].insert_one({"type": "global", **DEFAULT_FLAGS})
                    return DEFAULT_FLAGS
        except Exception as e:
            logger.error(f"Error reading feature flags: {e}")
            
        return DEFAULT_FLAGS

    @staticmethod
    async def update_flag(name: str, enabled: bool) -> bool:
        db = get_mongodb()
        if db is not None:
            result = await db["feature_flags"].update_one(
                {"type": "global"},
                {"$set": {name: enabled}},
                upsert=True
            )
            return result.modified_count > 0 or result.upserted_id is not None
        return False
