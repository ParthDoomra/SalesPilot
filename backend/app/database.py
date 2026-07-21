import json
import logging
import time
from typing import Dict, Any, List, Optional
import firebase_admin
from firebase_admin import credentials, firestore, storage
import redis

from app.config import settings

logger = logging.getLogger("salespilot.database")

# In-Memory database fallback for Demo Mode
class MockDocumentReference:
    def __init__(self, collection_name: str, doc_id: str, db_store: Dict[str, Dict[str, Any]]):
        self.collection_name = collection_name
        self.id = doc_id
        self.db_store = db_store

    def get(self):
        class MockDocumentSnapshot:
            def __init__(self, doc_id: str, data: Optional[Dict[str, Any]]):
                self.id = doc_id
                self._data = data
                self.exists = data is not None
            def to_dict(self):
                return self._data
        
        doc_data = self.db_store.get(self.collection_name, {}).get(self.id)
        return MockDocumentSnapshot(self.id, doc_data)

    def set(self, data: Dict[str, Any], merge: bool = False):
        if self.collection_name not in self.db_store:
            self.db_store[self.collection_name] = {}
        
        if merge and self.id in self.db_store[self.collection_name]:
            self.db_store[self.collection_name][self.id].update(data)
        else:
            self.db_store[self.collection_name][self.id] = data
        return self

    def update(self, data: Dict[str, Any]):
        return self.set(data, merge=True)

    def delete(self):
        if self.collection_name in self.db_store and self.id in self.db_store[self.collection_name]:
            del self.db_store[self.collection_name][self.id]
        return self

class MockCollectionReference:
    def __init__(self, collection_name: str, db_store: Dict[str, Dict[str, Any]]):
        self.collection_name = collection_name
        self.db_store = db_store

    def document(self, doc_id: str = None):
        if not doc_id:
            import uuid
            doc_id = str(uuid.uuid4())
        return MockDocumentReference(self.collection_name, doc_id, self.db_store)

    def stream(self):
        docs = []
        class MockDocumentSnapshot:
            def __init__(self, doc_id: str, data: Dict[str, Any]):
                self.id = doc_id
                self._data = data
                self.exists = True
            def to_dict(self):
                return self._data

        collection_data = self.db_store.get(self.collection_name, {})
        for doc_id, data in collection_data.items():
            docs.append(MockDocumentSnapshot(doc_id, data))
        return docs

    def where(self, field_path: str, op_string: str, value: Any):
        # Basic mock filtering
        class FilteredQuery:
            def __init__(self, collection_name: str, db_store: Dict[str, Dict[str, Any]], field: str, op: str, val: Any):
                self.collection_name = collection_name
                self.db_store = db_store
                self.field = field
                self.op = op
                self.val = val

            def stream(self):
                docs = []
                collection_data = self.db_store.get(self.collection_name, {})
                for doc_id, data in collection_data.items():
                    val_in_doc = data.get(self.field)
                    match = False
                    if self.op == "==":
                        match = val_in_doc == self.val
                    elif self.op == "in":
                        match = val_in_doc in self.val
                    
                    if match:
                        class MockDocumentSnapshot:
                            def __init__(self, doc_id: str, data: Dict[str, Any]):
                                self.id = doc_id
                                self._data = data
                                self.exists = True
                            def to_dict(self):
                                return self._data
                        docs.append(MockDocumentSnapshot(doc_id, data))
                return docs
        return FilteredQuery(self.collection_name, self.db_store, field_path, op_string, value)

class MockFirestoreClient:
    def __init__(self):
        self.db_store: Dict[str, Dict[str, Any]] = {}
        self._load_seed_data()

    def collection(self, collection_name: str):
        return MockCollectionReference(collection_name, self.db_store)

    def _load_seed_data(self):
        # Seed basic data for quick mock UI usage
        self.db_store["users"] = {
            "mock-admin-uid": {
                "uid": "mock-admin-uid",
                "email": "admin@salespilot.ai",
                "displayName": "Admin User",
                "orgId": "mock-org-123",
                "role": "Admin"
            },
            "mock-se-uid": {
                "uid": "mock-se-uid",
                "email": "se@salespilot.ai",
                "displayName": "Demo SE",
                "orgId": "mock-org-123",
                "role": "Sales Engineer"
            }
        }
        self.db_store["organizations"] = {
            "mock-org-123": {
                "id": "mock-org-123",
                "name": "Acme IT Consulting",
                "ownerId": "mock-admin-uid",
                "tier": "Enterprise",
                "activeCredits": 1000
            }
        }

class MockBlob:
    def __init__(self, name: str):
        self.name = name
        self.data = b""
        self.content_type = ""

    def upload_from_string(self, data, content_type=None):
        self.data = data.encode() if isinstance(data, str) else data
        self.content_type = content_type or ""

    def upload_from_filename(self, filename, content_type=None):
        with open(filename, 'rb') as f:
            self.data = f.read()
        self.content_type = content_type or ""

    def make_public(self):
        pass

    @property
    def public_url(self) -> str:
        return f"https://mock-storage.salespilot.ai/{self.name}"

class MockStorageBucket:
    def __init__(self):
        self.blobs = {}

    def blob(self, blob_name: str):
        if blob_name not in self.blobs:
            self.blobs[blob_name] = MockBlob(blob_name)
        return self.blobs[blob_name]

class MockRedisClient:
    def __init__(self):
        self.store = {}

    def get(self, key: str):
        return self.store.get(key)

    def set(self, key: str, value: Any):
        self.store[key] = value
        return True

    def setex(self, key: str, time_secs: int, value: Any):
        self.store[key] = value
        return True

    def exists(self, key: str) -> bool:
        return key in self.store

# Global instances initialized dynamically
db = None
bucket = None
cache = None

def init_databases():
    global db, bucket, cache
    
    # Initialize Firebase Admin
    if settings.is_firebase_configured and not settings.DEMO_MODE:
        try:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key": settings.FIREBASE_PRIVATE_KEY,
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            firebase_admin.initialize_app(cred, {
                'storageBucket': settings.FIREBASE_STORAGE_BUCKET
            })
            db = firestore.client()
            bucket = storage.bucket()
            logger.info("Firebase Admin initialized successfully in PRODUCTION mode.")
        except Exception as e:
            logger.error(f"Error initializing Firebase, falling back to mock database: {e}")
            db = MockFirestoreClient()
            bucket = MockStorageBucket()
    else:
        logger.info("Firebase not configured or DEMO_MODE=True. Initializing in-memory MOCK Firebase Client.")
        db = MockFirestoreClient()
        bucket = MockStorageBucket()

    # Initialize Redis
    if settings.is_redis_configured and not settings.DEMO_MODE:
        try:
            cache = redis.from_url(settings.REDIS_URL, decode_responses=True)
            logger.info("Redis cache initialized in PRODUCTION mode.")
        except Exception as e:
            logger.error(f"Error connecting to Redis, falling back to mock: {e}")
            cache = MockRedisClient()
    else:
        logger.info("Redis not configured. Initializing in-memory MOCK Redis Client.")
        cache = MockRedisClient()

# Auto run database initialization on import
init_databases()
