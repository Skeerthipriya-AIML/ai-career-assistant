import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.config import settings
from app.database.connection import get_mongodb
from app.core.security import get_password_hash
from app.api.v1 import auth, chatbot, agent, document, coach, admin, features, dashboard
from app.notifications import notification_api
from datetime import datetime

# Configure Logging
import os
logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "logs")
os.makedirs(logs_dir, exist_ok=True)

formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")

stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)

app_file = os.path.join(logs_dir, "application.log")
app_handler = logging.FileHandler(app_file, encoding="utf-8")
app_handler.setLevel(logging.INFO)
app_handler.setFormatter(formatter)

err_file = os.path.join(logs_dir, "errors.log")
err_handler = logging.FileHandler(err_file, encoding="utf-8")
err_handler.setLevel(logging.ERROR)
err_handler.setFormatter(formatter)

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.addHandler(stream_handler)
root_logger.addHandler(app_handler)
root_logger.addHandler(err_handler)

# Special Agent Logger Setup
agent_file = os.path.join(logs_dir, "agent.log")
agent_handler = logging.FileHandler(agent_file, encoding="utf-8")
agent_handler.setLevel(logging.INFO)
agent_handler.setFormatter(formatter)

agent_logger = logging.getLogger("app.agents.agent_service")
agent_logger.addHandler(agent_handler)
agent_logger.propagate = True

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API services for AI Career Assistant full-stack portfolio application.",
    version="1.0.0"
)

# Configure CORS Middleware
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    cors_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    cors_origins = [
        "http://localhost:5173",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app|https://.*\.netlify\.app|https://.*\.onrender\.com"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middlewares
from app.middleware.request_id import RequestIdMiddleware
from app.middleware.logging import StructuredLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.exception import GlobalExceptionMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

app.add_middleware(GlobalExceptionMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(RequestIdMiddleware)

# Startup Seeding Event
@app.on_event("startup")
async def startup_event():
    logger.info("Starting AI Career Assistant Backend Server...")
    
    # Connect and seed default Admin account if empty
    db = get_mongodb()
    if db is not None:
        try:
            admin_email = "admin@ai-career.com"
            existing_admin = await db["users"].find_one({"email": admin_email})
            
            if not existing_admin:
                admin_user = {
                    "email": admin_email,
                    "name": "Super Admin",
                    "username": "admin",
                    "password_hash": get_password_hash("adminpass"),
                    "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Admin",
                    "oauth_provider": None,
                    "is_admin": True,
                    "role": "ADMIN",
                    "onboarded": True,
                    "created_at": datetime.utcnow()
                }
                await db["users"].insert_one(admin_user)
                logger.info(f"Successfully seeded default admin user account: {admin_email} / adminpass")
            else:
                logger.info("Admin account already seeded.")
        except Exception as e:
            logger.error(f"Failed to seed admin user on startup: {e}")

# Register Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(auth.users_router, prefix="/api/v1", tags=["Users"])
app.include_router(chatbot.router, prefix="/api/v1/chatbot", tags=["AI Chatbot (RAG)"])
app.include_router(agent.router, prefix="/api/v1/agent", tags=["AI Agent Loop"])
app.include_router(document.router, prefix="/api/v1/document", tags=["Document Assistant"])
app.include_router(coach.router, prefix="/api/v1/coach", tags=["Interview Coach"])
app.include_router(features.router, prefix="/api/v1/features", tags=["Feature Flags"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin Portal"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard Stats"])
app.include_router(notification_api.router, prefix="/api/v1/notifications", tags=["Notifications Center"])

@app.get("/health")
def health_check():
    """
    Standard server health status reporting.
    """
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }
