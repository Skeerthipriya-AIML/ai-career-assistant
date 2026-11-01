import logging
from app.notifications.notification_repo import notification_repo

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    async def create_notification(user_id: str, text: str, notification_type: str):
        try:
            return await notification_repo.create(user_id, text, notification_type)
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            return None

    @staticmethod
    async def get_user_notifications(user_id: str):
        try:
            return await notification_repo.list_by_user(user_id)
        except Exception as e:
            logger.error(f"Error getting notifications: {e}")
            return []

    @staticmethod
    async def mark_notification_as_read(notification_id: str, user_id: str):
        try:
            return await notification_repo.mark_read(notification_id, user_id)
        except Exception as e:
            logger.error(f"Error marking notification read: {e}")
            return False

    @staticmethod
    async def mark_all_as_read(user_id: str):
        try:
            return await notification_repo.mark_all_read(user_id)
        except Exception as e:
            logger.error(f"Error marking all notifications read: {e}")
            return 0
