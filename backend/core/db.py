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
        cls.client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,   # fail fast — 5 s
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
        )
        cls.db = cls.client[settings.DB_NAME]
        logger.info("Connected to MongoDB")

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
