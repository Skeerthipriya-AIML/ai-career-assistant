import logging
from datetime import datetime
from typing import Dict, Any, Optional
from app.database.connection import get_mongodb
from app.audit.audit_models import AuditEvent

logger = logging.getLogger(__name__)

class AuditService:
    @staticmethod
    async def log_audit_event(
        user_id: Optional[str],
        email: Optional[str],
        event_type: str,
        client_ip: str,
        user_agent: str,
        details: Dict[str, Any] = None
    ) -> bool:
        if details is None:
            details = {}
            
        try:
            event = AuditEvent(
                user_id=user_id,
                email=email,
                event_type=event_type,
                client_ip=client_ip,
                user_agent=user_agent,
                details=details,
                timestamp=datetime.utcnow()
            )
            
            db = get_mongodb()
            if db is not None:
                await db["audit_logs"].insert_one(event.dict())
                logger.info(f"Audit log saved: {event_type} - {email or user_id or 'anonymous'}")
                return True
        except Exception as e:
            logger.error(f"Failed to save audit log: {e}")
            
        return False

    @staticmethod
    async def get_audit_events(limit: int = 50) -> list:
        db = get_mongodb()
        if db is not None:
            cursor = db["audit_logs"].find().sort("timestamp", -1).limit(limit)
            events = []
            async for doc in cursor:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
                if isinstance(doc.get("timestamp"), datetime):
                    doc["timestamp"] = doc["timestamp"].isoformat()
                events.append(doc)
            return events
        return []
