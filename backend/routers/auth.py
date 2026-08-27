import logging
import uuid
import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List

from core.db import database
from core.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Request models ────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class CreateStudentRequest(BaseModel):
    name: str
    email: str
    password: str
    roll_number: Optional[str] = None


class UpdateStudentRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    roll_number: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    school_name: Optional[str] = None
    city: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ═══════════════════════════════════════════════════════════════
#  POST /auth/signup — teacher self-registration
#  First user automatically becomes super_admin
# ═══════════════════════════════════════════════════════════════
@router.post("/signup")
async def signup(req: SignupRequest):
    users = database.get_users_collection()

    if await users.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    count = await users.count_documents({})
    role = "super_admin" if count == 0 else "teacher"

    user = {
        "user_id": str(uuid.uuid4()),
        "name": req.name,
        "email": req.email,
        "password_hash": hash_password(req.password),
        "role": role,
        "created_by": None,
        "roll_number": None,
        "created_at": datetime.datetime.utcnow().isoformat(),
    }
    await users.insert_one(user)

    token = create_access_token({"sub": user["user_id"], "role": role})
    logger.info(f"New {role} registered: {req.email}")

    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "role": role,
        },
    }


# ═══════════════════════════════════════════════════════════════
#  POST /auth/login
# ═══════════════════════════════════════════════════════════════
@router.post("/login")
async def login(req: LoginRequest):
    users = database.get_users_collection()
    user = await users.find_one({"email": req.email})

    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user["user_id"], "role": user["role"]})

    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        },
    }


# ═══════════════════════════════════════════════════════════════
#  GET /auth/me — validate token & return current user
# ═══════════════════════════════════════════════════════════════
@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    return user


# ═══════════════════════════════════════════════════════════════
#  PUT /auth/profile — update display name
# ═══════════════════════════════════════════════════════════════
@router.put("/profile")
async def update_profile(req: UpdateProfileRequest, user=Depends(get_current_user)):
    updates = {}
    if req.name is not None:
        name = req.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        updates["name"] = name
    if req.school_name is not None:
        updates["school_name"] = req.school_name.strip()
    if req.city is not None:
        updates["city"] = req.city.strip()

    if updates:
        users = database.get_users_collection()
        await users.update_one({"user_id": user["user_id"]}, {"$set": updates})

    users = database.get_users_collection()
    updated = await users.find_one({"user_id": user["user_id"]})
    updated.pop("_id", None)
    updated.pop("password_hash", None)
    logger.info(f"Profile updated: {user['email']} → {updates}")
    return updated


# ═══════════════════════════════════════════════════════════════
#  PUT /auth/change-password
# ═══════════════════════════════════════════════════════════════
@router.put("/change-password")
async def change_password(req: ChangePasswordRequest, user=Depends(get_current_user)):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    users = database.get_users_collection()
    full_user = await users.find_one({"user_id": user["user_id"]})

    if not full_user or not verify_password(req.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    await users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password_hash": hash_password(req.new_password)}},
    )
    logger.info(f"Password changed for: {user['email']}")
    return {"status": "password changed successfully"}


# ═══════════════════════════════════════════════════════════════
#  Student CRUD — teachers create/manage student accounts
# ═══════════════════════════════════════════════════════════════
@router.post("/students")
async def create_student(
    req: CreateStudentRequest,
    user=Depends(require_role("teacher", "super_admin")),
):
    users = database.get_users_collection()

    if await users.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    student = {
        "user_id": str(uuid.uuid4()),
        "name": req.name,
        "email": req.email,
        "password_hash": hash_password(req.password),
        "role": "student",
        "roll_number": req.roll_number or "",
        "created_by": user["user_id"],
        "created_at": datetime.datetime.utcnow().isoformat(),
    }
    await users.insert_one(student)
    logger.info(f"Student created: {req.name} by {user['name']}")

    student.pop("_id", None)
    student.pop("password_hash", None)
    return student


@router.get("/students")
async def list_students(user=Depends(get_current_user)):
    users = database.get_users_collection()

    if user["role"] == "super_admin":
        query = {"role": "student"}
    elif user["role"] == "teacher":
        query = {"role": "student", "created_by": user["user_id"]}
    else:
        raise HTTPException(status_code=403, detail="Students cannot access this endpoint")

    result = []
    async for doc in users.find(query):
        doc.pop("_id", None)
        doc.pop("password_hash", None)
        result.append(doc)
    return result


@router.put("/students/{student_id}")
async def update_student(
    student_id: str,
    req: UpdateStudentRequest,
    user=Depends(require_role("teacher", "super_admin")),
):
    users = database.get_users_collection()

    query = {"user_id": student_id, "role": "student"}
    if user["role"] != "super_admin":
        query["created_by"] = user["user_id"]

    student = await users.find_one(query)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    updates = {}
    if req.name is not None:
        updates["name"] = req.name
    if req.email is not None:
        existing = await users.find_one({"email": req.email, "user_id": {"$ne": student_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        updates["email"] = req.email
    if req.roll_number is not None:
        updates["roll_number"] = req.roll_number

    if updates:
        await users.update_one({"user_id": student_id}, {"$set": updates})

    updated = await users.find_one({"user_id": student_id})
    updated.pop("_id", None)
    updated.pop("password_hash", None)
    return updated


@router.delete("/students/{student_id}")
async def delete_student(
    student_id: str,
    user=Depends(require_role("teacher", "super_admin")),
):
    users = database.get_users_collection()

    query = {"user_id": student_id, "role": "student"}
    if user["role"] != "super_admin":
        query["created_by"] = user["user_id"]

    student = await users.find_one(query)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    await users.delete_one({"user_id": student_id})
    logger.info(f"Student deleted: {student['name']}")
    return {"status": "deleted"}
