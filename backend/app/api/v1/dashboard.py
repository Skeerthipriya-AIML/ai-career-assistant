from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from app.core.security import get_current_user
from app.analytics.analytics_service import AnalyticsService
from app.repositories.chat_repo import chat_repo

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    db = chat_repo.collection.database
    
    # 1. Chats today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    chats_today = await db["chats"].count_documents({
        "user_id": user_id,
        "created_at": {"$gte": today_start}
    })
    
    # 2. Documents uploaded (total)
    documents_uploaded = await db["documents"].count_documents({"user_id": user_id})
    
    # 3. Average interview score
    interviews_cursor = db["interviews"].find({"user_id": user_id})
    scores = []
    async for i in interviews_cursor:
        if "average_score" in i:
            scores.append(i["average_score"])
    interview_score = int(sum(scores) / len(scores)) if scores else 0
    
    # 4. AI Tokens used
    telemetry_cursor = db["telemetry"].find({"user_id": user_id})
    ai_tokens_used = 0
    async for t in telemetry_cursor:
        ai_tokens_used += t.get("tokens_used", 0)
        
    # 5. Active sessions
    active_sessions = await db["sessions"].count_documents({
        "user_id": user_id,
        "is_revoked": False
    })
    
    # 6. Weekly usage (chats, uploads, tokens over last 7 days)
    analytics = await AnalyticsService.get_user_analytics(user_id)
    weekly_usage = analytics["weekly_usage"]
    
    return {
        "chats_today": chats_today,
        "documents_uploaded": documents_uploaded,
        "interview_score": interview_score,
        "ai_tokens_used": ai_tokens_used,
        "active_sessions": active_sessions,
        "weekly_usage": weekly_usage,
        "file_distribution": analytics["file_distribution"],
        "most_used_tools": analytics["most_used_tools"],
        "interview_history": analytics["interview_history"]
    }
