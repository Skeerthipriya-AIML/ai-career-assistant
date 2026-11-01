import logging
from bson import ObjectId
from datetime import datetime
import motor.motor_asyncio
from pymongo import MongoClient
import chromadb
from app.config.config import settings

logger = logging.getLogger(__name__)

# --- In-Memory Async Mongo Fallback Implementation ---
class InMemoryInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id
        self.acknowledged = True

class InMemoryUpdateResult:
    def __init__(self, modified_count, upserted_id=None, matched_count=None):
        self.modified_count = modified_count
        self.matched_count = matched_count if matched_count is not None else (1 if modified_count > 0 or upserted_id else 0)
        self.upserted_id = upserted_id
        self.acknowledged = True

class InMemoryDeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count
        self.acknowledged = True

class InMemoryCursor:
    def __init__(self, docs):
        self._docs = list(docs)

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            field, direction = key_or_list[0]
        else:
            field = key_or_list
        reverse = (direction == -1)
        self._docs.sort(key=lambda d: d.get(field) or "", reverse=reverse)
        return self

    def skip(self, n):
        if n > 0:
            self._docs = self._docs[n:]
        return self

    def limit(self, n):
        if n > 0:
            self._docs = self._docs[:n]
        return self

    async def to_list(self, length=None):
        if length is not None:
            return self._docs[:length]
        return self._docs

    def __aiter__(self):
        self._iter = iter(self._docs)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration

class InMemoryCollection:
    def __init__(self, database, name):
        self.database = database
        self.name = name
        self._documents = []

    def _matches(self, doc, query):
        if not query:
            return True
        for key, val in query.items():
            if key == "_id":
                doc_id = doc.get("_id")
                if str(doc_id) != str(val) and doc_id != val:
                    return False
            elif key.startswith("$"):
                pass
            elif isinstance(val, dict):
                doc_val = doc.get(key)
                for op, op_val in val.items():
                    if op == "$lt":
                        if doc_val is None or not (doc_val < op_val):
                            return False
                    elif op == "$lte":
                        if doc_val is None or not (doc_val <= op_val):
                            return False
                    elif op == "$gt":
                        if doc_val is None or not (doc_val > op_val):
                            return False
                    elif op == "$gte":
                        if doc_val is None or not (doc_val >= op_val):
                            return False
                    elif op == "$ne":
                        if doc_val == op_val:
                            return False
                    elif op == "$in":
                        if doc_val not in op_val:
                            return False
            else:
                if doc.get(key) != val:
                    return False
        return True

    async def insert_one(self, doc):
        doc_copy = dict(doc)
        if "_id" not in doc_copy:
            doc_copy["_id"] = ObjectId()
        self._documents.append(doc_copy)
        return InMemoryInsertResult(doc_copy["_id"])

    async def find_one(self, query=None, sort=None):
        cursor = self.find(query)
        if sort:
            cursor.sort(sort)
        docs = await cursor.to_list(1)
        return docs[0] if docs else None

    def find(self, query=None):
        matching = [dict(d) for d in self._documents if self._matches(d, query)]
        return InMemoryCursor(matching)

    async def count_documents(self, query=None):
        matching = [d for d in self._documents if self._matches(d, query)]
        return len(matching)

    async def update_one(self, query, update, upsert=False):
        for doc in self._documents:
            if self._matches(doc, query):
                self._apply_update(doc, update)
                return InMemoryUpdateResult(1, matched_count=1)
        if upsert:
            new_doc = {}
            if query:
                for k, v in query.items():
                    if not k.startswith("$") and not isinstance(v, dict):
                        new_doc[k] = v
            self._apply_update(new_doc, update)
            if "_id" not in new_doc:
                new_doc["_id"] = ObjectId()
            self._documents.append(new_doc)
            return InMemoryUpdateResult(1, new_doc["_id"], matched_count=0)
        return InMemoryUpdateResult(0, matched_count=0)

    async def update_many(self, query, update, upsert=False):
        modified = 0
        matched = 0
        for doc in self._documents:
            if self._matches(doc, query):
                matched += 1
                self._apply_update(doc, update)
                modified += 1
        return InMemoryUpdateResult(modified, matched_count=matched)

    def _apply_update(self, doc, update):
        if "$set" in update:
            for k, v in update["$set"].items():
                doc[k] = v
        if "$inc" in update:
            for k, v in update["$inc"].items():
                doc[k] = doc.get(k, 0) + v
        if "$push" in update:
            for k, v in update["$push"].items():
                if k not in doc or not isinstance(doc[k], list):
                    doc[k] = []
                if isinstance(v, dict) and "$each" in v:
                    doc[k].extend(v["$each"])
                else:
                    doc[k].append(v)
        if "$unset" in update:
            for k in update["$unset"].keys():
                doc.pop(k, None)

    async def delete_one(self, query):
        for i, doc in enumerate(self._documents):
            if self._matches(doc, query):
                self._documents.pop(i)
                return InMemoryDeleteResult(1)
        return InMemoryDeleteResult(0)

    async def delete_many(self, query):
        initial_count = len(self._documents)
        self._documents = [d for d in self._documents if not self._matches(d, query)]
        deleted = initial_count - len(self._documents)
        return InMemoryDeleteResult(deleted)

    def aggregate(self, pipeline):
        return InMemoryCursor([])

class InMemoryDatabase:
    def __init__(self, name="ai_career_assistant"):
        self.name = name
        self._collections = {}

    def __getitem__(self, coll_name):
        if coll_name not in self._collections:
            self._collections[coll_name] = InMemoryCollection(self, coll_name)
        return self._collections[coll_name]

    async def command(self, cmd, *args, **kwargs):
        if cmd == "ping":
            return {"ok": 1.0}
        return {"ok": 1.0}

# Helper to check Mongo reachability
def is_mongo_reachable(uri: str) -> bool:
    try:
        test_client = MongoClient(
            uri,
            serverSelectionTimeoutMS=1000,
            connectTimeoutMS=1000,
            socketTimeoutMS=1000
        )
        test_client.admin.command('ping')
        return True
    except Exception:
        return False

# Initialize Database Client
db_name = settings.MONGODB_URI.split("/")[-1].split("?")[0] or "ai_career_assistant"
mongo_client = None

if is_mongo_reachable(settings.MONGODB_URI):
    try:
        mongo_client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
        db = mongo_client[db_name]
        logger.info("MongoDB client connected successfully.")
    except Exception as e:
        logger.warning(f"Failed to connect to MongoDB: {e}. Using In-Memory Database fallback.")
        db = InMemoryDatabase(db_name)
else:
    logger.info(f"MongoDB not reachable at {settings.MONGODB_URI}. Utilizing In-Memory Database fallback for local execution without Docker/Mongo.")
    db = InMemoryDatabase(db_name)

# Initialize ChromaDB Client
try:
    chroma_client = chromadb.PersistentClient(
        path=settings.CHROMA_DB_PATH,
        settings=chromadb.Settings(anonymized_telemetry=False)
    )
    logger.info(f"ChromaDB persistent client initialized at {settings.CHROMA_DB_PATH}")
except Exception as e:
    logger.error(f"Error initializing ChromaDB client: {e}")
    chroma_client = chromadb.EphemeralClient(
        settings=chromadb.Settings(anonymized_telemetry=False)
    )

def get_mongodb():
    return db

def get_chromadb():
    return chroma_client
