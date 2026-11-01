from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class AuditEvent(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    event_type: str  # "LOGIN", "LOGOUT", "PASSWORD_CHANGE", "EMAIL_VERIFICATION", "FAILED_LOGIN", "PROFILE_UPDATE", "ROLE_CHANGE"
    client_ip: str
    user_agent: str
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
