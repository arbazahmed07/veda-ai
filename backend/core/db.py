import logging
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from typing import Optional

logger = logging.getLogger(__name__)

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db = None

    @classmethod
    def connect_db(cls):
        try:
            if settings.MONGO_URI:
                cls.client = AsyncIOMotorClient(
                    settings.MONGO_URI,
                    serverSelectionTimeoutMS=2000,   # fail fast — 2 s
                    connectTimeoutMS=2000,
                    socketTimeoutMS=5000,
                )
                cls.db = cls.client[settings.DB_NAME]
                logger.info("Connected to MongoDB")
            else:
                logger.info("No MONGO_URI provided — running in pure in-memory mode")
        except Exception as e:
            logger.warning(f"MongoDB connection failed: {e}. Running in pure in-memory mode.")
            cls.client = None
            cls.db = None

    @classmethod
    def close_db(cls):
        if cls.client:
            cls.client.close()
            logger.info("Disconnected from MongoDB")

    @classmethod
    def get_evaluations_collection(cls):
        return cls.db["evaluations"]

    @classmethod
    def get_users_collection(cls):
        return cls.db["users"]

    @classmethod
    def get_exams_collection(cls):
        return cls.db["exams"]

    @classmethod
    def get_plagiarism_records_collection(cls):
        return cls.db["plagiarism_records"]

database = Database()
