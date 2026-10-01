"""
HarvestLink AI — Buyer & Order Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.models import Buyer, Order
from app.schemas.schemas import (
    BuyerCreate, BuyerResponse,
    OrderCreate, OrderResponse,
)

router = APIRouter()


# ──────────────────── BUYERS ────────────────────

@router.post("/buyers", response_model=BuyerResponse, status_code=201)
async def create_buyer(buyer: BuyerCreate, db: AsyncSession = Depends(get_db)):
    """Register a new buyer."""
    db_buyer = Buyer(**buyer.model_dump())
    db.add(db_buyer)
    await db.flush()
    await db.refresh(db_buyer)
    return db_buyer


@router.get("/buyers", response_model=List[BuyerResponse])
async def list_buyers(db: AsyncSession = Depends(get_db)):
    """List all registered buyers."""
    result = await db.execute(select(Buyer))
    return result.scalars().all()


# ──────────────────── ORDERS ────────────────────

@router.post("/orders", response_model=OrderResponse, status_code=201)
async def create_order(order: OrderCreate, db: AsyncSession = Depends(get_db)):
    """Create a new buyer demand order."""
    # Verify buyer exists
    buyer = await db.get(Buyer, order.buyer_id)
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    db_order = Order(**order.model_dump())
    db.add(db_order)
    await db.flush()
    await db.refresh(db_order)

    return OrderResponse(
        id=db_order.id,
        buyer_id=db_order.buyer_id,
        quantity=db_order.quantity,
        quality_grade=db_order.quality_grade,
        delivery_date=db_order.delivery_date,
        recurring=db_order.recurring,
        frequency=db_order.frequency,
        status=db_order.status,
        buyer_name=buyer.name,
    )


@router.get("/orders", response_model=List[OrderResponse])
async def list_orders(db: AsyncSession = Depends(get_db)):
    """List all active orders with buyer information."""
    result = await db.execute(
        select(Order, Buyer)
        .join(Buyer, Order.buyer_id == Buyer.id)
    )
    orders = []
    for order, buyer in result.all():
        orders.append(OrderResponse(
            id=order.id,
            buyer_id=order.buyer_id,
            quantity=order.quantity,
            quality_grade=order.quality_grade,
            delivery_date=order.delivery_date,
            recurring=order.recurring,
            frequency=order.frequency,
            status=order.status,
            buyer_name=buyer.name,
        ))
    return orders
