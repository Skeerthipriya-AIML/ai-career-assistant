from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.security import get_current_user
from app.notifications.notification_service import NotificationService

router = APIRouter()

@router.get("")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    return await NotificationService.get_user_notifications(current_user["id"])

@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    success = await NotificationService.mark_notification_as_read(notification_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found or access denied.")
    return {"success": True}

@router.post("/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    count = await NotificationService.mark_all_as_read(current_user["id"])
    return {"success": True, "marked_count": count}

@router.post("/announce")
async def make_system_announcement(text: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin permissions required.")
    await NotificationService.create_notification("all", text, "system announcements")
    return {"success": True}
