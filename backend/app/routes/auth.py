"""
HarvestLink AI — Authentication Routes
Endpoints for user login, session validation, and current profile fetching.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.models import User, Farmer, Buyer, Vehicle
from app.services.auth import verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = None


@router.post("/login")
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user with username and password, return JWT token and role profile."""
    username = credentials.username.strip()
    password = credentials.password.strip()

    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # If role was requested, verify match
    if credentials.role and credentials.role != "all" and user.role != credentials.role:
        raise HTTPException(
            status_code=403,
            detail=f"This account is registered as '{user.role}', not '{credentials.role}'"
        )

    # Fetch associated entity details
    entity_data = {}
    if user.role == "farmer" and user.farmer_id:
        farmer = await db.get(Farmer, user.farmer_id)
        if farmer:
            entity_data = {
                "farmer_id": farmer.id,
                "name": farmer.name,
                "farm_name": getattr(farmer, "farm_name", None) or f"{farmer.name}'s Farm",
                "location": farmer.location,
                "farm_size": farmer.farm_size,
                "producer_type": farmer.producer_type,
                "crop": getattr(farmer, "crop", "Tomato"),
                "phone": farmer.phone,
                "email": farmer.email,
                "pan_card": farmer.pan_card,
                "aadhaar_last4": farmer.aadhaar_last4,
            }
    elif user.role == "buyer" and user.buyer_id:
        buyer = await db.get(Buyer, user.buyer_id)
        if buyer:
            entity_data = {
                "buyer_id": buyer.id,
                "name": buyer.name,
                "location": buyer.location,
                "contact": buyer.contact,
                "phone": buyer.phone,
                "aadhaar_last4": buyer.aadhaar_last4,
            }
    elif user.role == "transporter":
        # Get vehicles managed by transporter
        v_result = await db.execute(select(Vehicle))
        vehicles = v_result.scalars().all()
        entity_data = {
            "transporter_name": "Raj Transport Services",
            "vehicles": [
                {
                    "id": v.id,
                    "vehicle_number": v.vehicle_number,
                    "capacity": v.capacity,
                    "available_capacity": v.available_capacity,
                    "driver_name": v.driver_name,
                    "driver_contact": v.driver_contact,
                    "status": v.status,
                    "cost_per_trip": v.cost_per_trip,
                    "current_location": v.current_location,
                }
                for v in vehicles
            ]
        }

    token_payload = {
        "sub": user.username,
        "user_id": user.id,
        "role": user.role,
        "farmer_id": user.farmer_id,
        "buyer_id": user.buyer_id,
        "vehicle_id": user.vehicle_id,
    }
    token = create_access_token(token_payload)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "full_name": user.full_name,
            "farmer_id": user.farmer_id,
            "buyer_id": user.buyer_id,
            "vehicle_id": user.vehicle_id,
            "profile": entity_data,
        }
    }


@router.get("/me")
async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve currently authenticated user profile from JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    username = payload.get("sub")
    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    entity_data = {}
    if user.role == "farmer" and user.farmer_id:
        farmer = await db.get(Farmer, user.farmer_id)
        if farmer:
            entity_data = {
                "farmer_id": farmer.id,
                "name": farmer.name,
                "farm_name": getattr(farmer, "farm_name", None) or f"{farmer.name}'s Farm",
                "location": farmer.location,
                "farm_size": farmer.farm_size,
                "producer_type": farmer.producer_type,
                "crop": getattr(farmer, "crop", "Tomato"),
                "phone": farmer.phone,
                "email": farmer.email,
                "pan_card": farmer.pan_card,
                "aadhaar_last4": farmer.aadhaar_last4,
            }
    elif user.role == "buyer" and user.buyer_id:
        buyer = await db.get(Buyer, user.buyer_id)
        if buyer:
            entity_data = {
                "buyer_id": buyer.id,
                "name": buyer.name,
                "location": buyer.location,
                "contact": buyer.contact,
                "phone": buyer.phone,
                "aadhaar_last4": buyer.aadhaar_last4,
            }

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name,
        "farmer_id": user.farmer_id,
        "buyer_id": user.buyer_id,
        "vehicle_id": user.vehicle_id,
        "profile": entity_data,
    }


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    """List all accounts (for admin use)."""
    stmt = select(User)
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "full_name": u.full_name,
            "farmer_id": u.farmer_id,
            "buyer_id": u.buyer_id,
            "created_at": u.created_at,
        }
        for u in users
    ]
