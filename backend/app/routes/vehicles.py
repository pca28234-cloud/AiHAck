"""
HarvestLink AI — Vehicle Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.models import Vehicle
from app.schemas.schemas import VehicleCreate, VehicleResponse

router = APIRouter()


@router.post("/vehicles", response_model=VehicleResponse, status_code=201)
async def create_vehicle(vehicle: VehicleCreate, db: AsyncSession = Depends(get_db)):
    """Add a new vehicle to the fleet."""
    if vehicle.available_capacity > vehicle.capacity:
        raise HTTPException(
            status_code=400,
            detail="Available capacity cannot exceed total capacity"
        )

    db_vehicle = Vehicle(**vehicle.model_dump())
    db.add(db_vehicle)
    await db.flush()
    await db.refresh(db_vehicle)
    return db_vehicle


@router.get("/vehicles", response_model=List[VehicleResponse])
async def list_vehicles(db: AsyncSession = Depends(get_db)):
    """List all vehicles."""
    result = await db.execute(select(Vehicle))
    return result.scalars().all()
