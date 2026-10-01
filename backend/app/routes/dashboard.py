"""
HarvestLink AI — Dashboard Route
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.models import Farmer, Harvest, Buyer, Order, Vehicle, Allocation
from app.schemas.schemas import DashboardData

router = APIRouter()


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    """Get aggregated dashboard KPIs and metrics."""

    # Active harvests (estimated or sorted)
    harvest_result = await db.execute(
        select(Harvest).where(Harvest.status.in_(["estimated", "sorted"]))
    )
    harvests = harvest_result.scalars().all()
    total_harvest = sum(
        (h.sorted_quantity if h.sorted_quantity is not None else h.estimated_quantity)
        for h in harvests
    )

    # Quality distribution
    quality_dist = {"A": 0.0, "B": 0.0, "C": 0.0}
    for h in harvests:
        qty = h.sorted_quantity if h.sorted_quantity is not None else h.estimated_quantity
        quality_dist[h.quality_grade] = quality_dist.get(h.quality_grade, 0) + qty

    # Active orders
    order_result = await db.execute(
        select(Order).where(Order.status == "active")
    )
    orders = order_result.scalars().all()
    total_demand = sum(o.quantity for o in orders)

    # Vehicles
    vehicle_result = await db.execute(
        select(Vehicle).where(Vehicle.status == "available")
    )
    vehicles = vehicle_result.scalars().all()
    total_capacity = sum(v.capacity for v in vehicles)
    total_available = sum(v.available_capacity for v in vehicles)

    # Allocations
    alloc_result = await db.execute(select(Allocation))
    allocations = alloc_result.scalars().all()
    total_matched = sum(a.quantity for a in allocations)

    # Farmers
    farmer_result = await db.execute(select(Farmer))
    farmers = farmer_result.scalars().all()
    active_farmers = len(farmers)
    small_producers = len([f for f in farmers if f.producer_type == "small"])
    large_producers = len([f for f in farmers if f.producer_type == "large"])

    # Buyers
    buyer_count_result = await db.execute(select(func.count(Buyer.id)))
    active_buyers = buyer_count_result.scalar() or 0

    return DashboardData(
        total_harvest=round(total_harvest, 1),
        total_demand=round(total_demand, 1),
        total_matched=round(total_matched, 1),
        total_transport_capacity=round(total_capacity, 1),
        total_available_transport=round(total_available, 1),
        active_farmers=active_farmers,
        active_buyers=active_buyers,
        active_orders=len(orders),
        collection_slots=len(allocations),
        small_producers=small_producers,
        large_producers=large_producers,
        quality_distribution=quality_dist,
        unallocated=round(max(0, total_harvest - total_matched), 1),
        unmet_demand=round(max(0, total_demand - total_matched), 1),
    )
