from enum import Enum

class EventType(str, Enum):
    USER_REGISTERED = "user.registered"
    USER_LOGGED_IN = "user.logged_in"
    DOCUMENT_UPLOADED = "document.uploaded"
    AGENT_RUN_COMPLETED = "agent.run_completed"
    TELEMETRY_LOGGED = "telemetry.logged"
    INTERVIEW_COMPLETED = "interview.completed"
