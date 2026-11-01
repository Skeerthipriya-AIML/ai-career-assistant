from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database.connection import get_mongodb

class BaseRepository:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self):
        db = get_mongodb()
        if db is None:
            raise RuntimeError("Database connection is not initialized.")
        return db[self.collection_name]
