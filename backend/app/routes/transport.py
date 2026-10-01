"""
HarvestLink AI — Orders, BuyerRequests, Transport & Notifications Routes

This module handles the full flow:
  Buyer sends request → Farmer accepts/rejects → AI recommends trucks → Trucks allocated
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.models import (
    Farmer, Harvest, Buyer, Order, BuyerRequest,
    Vehicle, TransportRecommendation, TruckAllocation, Notification, Allocation
)
from app.websocket.manager import manager
from app.services.transport_optimizer import optimize_transport, get_alternatives, TruckOption

router = APIRouter()


# ──────────────────── HELPER ────────────────────

def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


async def _notify(
    db: AsyncSession,
    role: str,
    event: str,
    title: str,
    message: str,
    order_id: Optional[int] = None,
    user_id: Optional[int] = None,
):
    """Create a notification record and broadcast via WebSocket."""
    n = Notification(
        role=role,
        user_id=user_id,
        event=event,
        title=title,
        message=message,
        order_id=order_id,
        created_at=_now(),
    )
    db.add(n)

    ws_data = {
        "title": title,
        "message": message,
        "order_id": order_id,
        "event": event,
    }
    if role == "farmer":
        await manager.broadcast_to_farmer("notification", ws_data)
    elif role == "buyer":
        await manager.broadcast_to_buyer("notification", ws_data)
    else:
        await manager.broadcast_to_all("notification", ws_data)


# ──────────────────── WEBSOCKET ENDPOINT ────────────────────

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, role: str = "all"):
    await manager.connect(websocket, role)
    try:
        while True:
            # Keep connection alive — client can send pings
            data = await websocket.receive_text()
            # Echo back as pong
            if data == "ping":
                await websocket.send_text('{"event":"pong"}')
    except WebSocketDisconnect:
        manager.disconnect(websocket, role)


# ──────────────────── HARVESTS (extended) ────────────────────

@router.get("/harvests/available")
async def list_available_harvests(db: AsyncSession = Depends(get_db)):
    """List harvests available for buyers to request (estimated or sorted status)."""
    result = await db.execute(
        select(Harvest, Farmer)
        .join(Farmer, Harvest.farmer_id == Farmer.id)
        .where(Harvest.status.in_(["estimated", "sorted"]))
    )
    harvests = []
    for harvest, farmer in result.all():
        harvests.append({
            "id": harvest.id,
            "farmer_id": harvest.farmer_id,
            "farmer_name": farmer.name,
            "farmer_location": farmer.location,
            "crop": harvest.crop,
            "estimated_quantity": harvest.estimated_quantity,
            "sorted_quantity": harvest.sorted_quantity,
            "available_quantity": harvest.available_quantity,
            "quality_grade": harvest.quality_grade,
            "harvest_date": harvest.harvest_date,
            "available_date": getattr(harvest, "available_date", None),
            "location": getattr(harvest, "location", farmer.location),
            "expected_price": getattr(harvest, "expected_price", None),
            "status": harvest.status,
        })
    return harvests


# ──────────────────── BUYER REQUESTS ────────────────────

@router.post("/buyer-requests", status_code=201)
async def create_buyer_request(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """Buyer sends a purchase request for a specific harvest."""
    buyer_id = data.get("buyer_id")
    harvest_id = data.get("harvest_id")
    quantity = data.get("quantity")
    quality_grade = data.get("quality_grade", "A")
    delivery_date = data.get("delivery_date")
    delivery_location = data.get("delivery_location", "")
    message = data.get("message", "")

    if not all([buyer_id, harvest_id, quantity, delivery_date]):
        raise HTTPException(status_code=400, detail="Missing required fields")

    buyer = await db.get(Buyer, buyer_id)
    harvest = await db.get(Harvest, harvest_id)
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    if not harvest:
        raise HTTPException(status_code=404, detail="Harvest not found")

    # Create an Order record too (status=requested)
    order = Order(
        buyer_id=buyer_id,
        harvest_id=harvest_id,
        quantity=float(quantity),
        quality_grade=quality_grade.upper(),
        delivery_date=delivery_date,
        delivery_location=delivery_location,
        recurring=False,
        frequency="none",
        status="requested",
    )
    db.add(order)
    await db.flush()
    await db.refresh(order)

    br = BuyerRequest(
        buyer_id=buyer_id,
        harvest_id=harvest_id,
        order_id=order.id,
        quantity=float(quantity),
        quality_grade=quality_grade.upper(),
        delivery_date=delivery_date,
        delivery_location=delivery_location,
        message=message,
        status="pending",
        created_at=_now(),
    )
    db.add(br)
    await db.flush()

    # Notify farmer via WebSocket
    await _notify(
        db, "farmer", "buyer_request_created",
        "New Buyer Request",
        f"{buyer.name} requested {quantity} kg Grade {quality_grade} — {harvest.crop}.",
        order_id=order.id,
    )
    await manager.broadcast_to_farmer("buyer_request_created", {
        "order_id": order.id,
        "buyer_name": buyer.name,
        "quantity": quantity,
        "quality_grade": quality_grade,
        "crop": harvest.crop,
    })

    return {
        "id": br.id,
        "order_id": order.id,
        "buyer_id": buyer_id,
        "harvest_id": harvest_id,
        "quantity": quantity,
        "quality_grade": quality_grade,
        "status": "pending",
        "message": "Request sent to farmer successfully.",
    }


@router.get("/buyer-requests")
async def list_buyer_requests(db: AsyncSession = Depends(get_db)):
    """List all buyer requests with farmer/harvest/buyer details."""
    result = await db.execute(
        select(BuyerRequest, Buyer, Harvest, Farmer)
        .join(Buyer, BuyerRequest.buyer_id == Buyer.id)
        .join(Harvest, BuyerRequest.harvest_id == Harvest.id)
        .join(Farmer, Harvest.farmer_id == Farmer.id)
    )
    out = []
    for br, buyer, harvest, farmer in result.all():
        out.append({
            "id": br.id,
            "order_id": br.order_id,
            "buyer_id": br.buyer_id,
            "buyer_name": buyer.name,
            "buyer_location": buyer.location,
            "harvest_id": br.harvest_id,
            "crop": harvest.crop,
            "farmer_id": farmer.id,
            "farmer_name": farmer.name,
            "quantity": br.quantity,
            "quality_grade": br.quality_grade,
            "delivery_date": br.delivery_date,
            "delivery_location": br.delivery_location,
            "message": br.message,
            "status": br.status,
            "created_at": br.created_at,
        })
    return out


# ──────────────────── ORDER ACCEPT / REJECT ────────────────────

@router.post("/orders/{order_id}/accept")
async def accept_order(order_id: int, db: AsyncSession = Depends(get_db)):
    """Farmer accepts a buyer request → triggers AI transport recommendation."""
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ("requested", "active"):
        raise HTTPException(status_code=400, detail=f"Order is already {order.status}")

    order.status = "accepted"

    # Update linked BuyerRequest
    br_result = await db.execute(
        select(BuyerRequest).where(BuyerRequest.order_id == order_id)
    )
    for br in br_result.scalars().all():
        br.status = "accepted"

    buyer = await db.get(Buyer, order.buyer_id)

    # Broadcast to buyer
    await manager.broadcast_to_buyer("request_accepted", {
        "order_id": order_id,
        "status": "accepted",
        "message": "Your request has been accepted by the farmer!",
    })

    # Notify buyer
    await _notify(
        db, "buyer", "request_accepted",
        "Request Accepted! 🎉",
        f"Your order #{order_id} for {order.quantity} kg Grade {order.quality_grade} has been accepted.",
        order_id=order_id,
        user_id=order.buyer_id,
    )

    # Auto-trigger transport recommendation
    recommendation = await _run_transport_agent(order_id, db)

    await manager.broadcast_to_farmer_and_buyer("request_accepted", {
        "order_id": order_id,
        "status": "accepted",
    })

    return {
        "order_id": order_id,
        "status": "accepted",
        "transport_recommendation": recommendation,
    }


@router.post("/orders/{order_id}/reject")
async def reject_order(order_id: int, db: AsyncSession = Depends(get_db)):
    """Farmer rejects a buyer request."""
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = "rejected"

    br_result = await db.execute(
        select(BuyerRequest).where(BuyerRequest.order_id == order_id)
    )
    for br in br_result.scalars().all():
        br.status = "rejected"

    await manager.broadcast_to_buyer("request_rejected", {
        "order_id": order_id,
        "status": "rejected",
        "message": "Unfortunately, the farmer has rejected your request.",
    })

    await _notify(
        db, "buyer", "request_rejected",
        "Request Rejected",
        f"Your order #{order_id} has been rejected by the farmer.",
        order_id=order_id,
        user_id=order.buyer_id,
    )

    return {"order_id": order_id, "status": "rejected"}


# ──────────────────── TRANSPORT AGENT ────────────────────

async def _run_transport_agent(order_id: int, db: AsyncSession) -> Optional[dict]:
    """
    Internal: Run transport optimization for an order.
    Called automatically after farmer accepts.
    """
    order = await db.get(Order, order_id)
    if not order:
        return None

    # Get available vehicles
    v_result = await db.execute(
        select(Vehicle).where(Vehicle.status == "available")
    )
    vehicles = v_result.scalars().all()

    truck_options = [
        TruckOption(
            vehicle_id=v.id,
            vehicle_number=v.vehicle_number,
            capacity=v.capacity,
            available_capacity=v.available_capacity,
            cost=v.cost_per_trip or (v.capacity * 2),  # fallback: ₹2/kg capacity
            driver_name=v.driver_name,
            driver_contact=v.driver_contact,
            current_location=v.current_location,
        )
        for v in vehicles
    ]

    plan = optimize_transport(order.quantity, truck_options)
    if not plan:
        return None

    # Save recommendation
    rec = TransportRecommendation(
        order_id=order_id,
        required_quantity=order.quantity,
        allocated_capacity=plan.total_capacity,
        total_cost=plan.total_cost,
        trucks_count=plan.trucks_count,
        reason=plan.reason,
        status="pending",
        created_at=_now(),
    )
    db.add(rec)
    await db.flush()
    await db.refresh(rec)

    # Save truck allocations
    for t in plan.trucks:
        ta = TruckAllocation(
            recommendation_id=rec.id,
            order_id=order_id,
            vehicle_id=t["vehicle_id"],
            assigned_capacity=t["assigned_capacity"],
            cost=t["cost"],
            status="assigned",
        )
        db.add(ta)
        # Mark vehicle as assigned
        v = await db.get(Vehicle, t["vehicle_id"])
        if v:
            v.status = "assigned"

    # Update order status
    order.status = "transport_allocated"

    recommendation_data = {
        "recommendation_id": rec.id,
        "order_id": order_id,
        "required_quantity": plan.required_quantity,
        "allocated_capacity": plan.total_capacity,
        "total_cost": plan.total_cost,
        "trucks_count": plan.trucks_count,
        "unused_capacity": plan.unused_capacity,
        "trucks": plan.trucks,
        "reason": plan.reason,
        "is_exact": plan.is_exact,
    }

    # Broadcast to farmer and buyer
    await manager.broadcast_to_farmer_and_buyer("transport_allocated", recommendation_data)

    await _notify(
        db, "farmer", "transport_allocated",
        "🚛 Transport Allocated",
        f"AI assigned {plan.trucks_count} truck(s) for order #{order_id}. Total capacity: {plan.total_capacity:.0f} kg. Cost: ₹{plan.total_cost:.0f}.",
        order_id=order_id,
    )
    await _notify(
        db, "buyer", "transport_allocated",
        "🚛 Transport Assigned",
        f"Transport has been allocated for your order #{order_id}. {plan.trucks_count} truck(s) assigned.",
        order_id=order_id,
        user_id=order.buyer_id,
    )

    return recommendation_data


@router.post("/transport/recommend/{order_id}")
async def recommend_transport(order_id: int, db: AsyncSession = Depends(get_db)):
    """Manually trigger AI transport recommendation for an order."""
    result = await _run_transport_agent(order_id, db)
    if not result:
        raise HTTPException(
            status_code=422,
            detail="No valid truck combination found. Check available trucks and their capacities."
        )
    return result


@router.get("/transport/recommendations/{order_id}")
async def get_transport_recommendation(order_id: int, db: AsyncSession = Depends(get_db)):
    """Get the current transport recommendation for an order."""
    result = await db.execute(
        select(TransportRecommendation)
        .where(TransportRecommendation.order_id == order_id)
        .order_by(TransportRecommendation.id.desc())
    )
    rec = result.scalars().first()
    if not rec:
        raise HTTPException(status_code=404, detail="No recommendation found for this order")

    # Get truck allocations
    ta_result = await db.execute(
        select(TruckAllocation, Vehicle)
        .join(Vehicle, TruckAllocation.vehicle_id == Vehicle.id)
        .where(TruckAllocation.recommendation_id == rec.id)
    )
    trucks = []
    for ta, v in ta_result.all():
        trucks.append({
            "truck_allocation_id": ta.id,
            "vehicle_id": v.id,
            "vehicle_number": v.vehicle_number,
            "capacity": v.capacity,
            "assigned_capacity": ta.assigned_capacity,
            "cost": ta.cost,
            "driver_name": v.driver_name,
            "driver_contact": v.driver_contact,
            "current_location": v.current_location,
            "status": ta.status,
        })

    return {
        "recommendation_id": rec.id,
        "order_id": order_id,
        "required_quantity": rec.required_quantity,
        "allocated_capacity": rec.allocated_capacity,
        "total_cost": rec.total_cost,
        "trucks_count": rec.trucks_count,
        "unused_capacity": rec.allocated_capacity - rec.required_quantity,
        "trucks": trucks,
        "reason": rec.reason,
        "status": rec.status,
        "created_at": rec.created_at,
    }


@router.post("/transport/alternatives/{order_id}")
async def get_transport_alternatives(order_id: int, db: AsyncSession = Depends(get_db)):
    """Get alternative truck combinations for an order."""
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    v_result = await db.execute(
        select(Vehicle).where(Vehicle.status.in_(["available", "assigned"]))
    )
    vehicles = v_result.scalars().all()

    truck_options = [
        TruckOption(
            vehicle_id=v.id,
            vehicle_number=v.vehicle_number,
            capacity=v.capacity,
            available_capacity=v.available_capacity,
            cost=v.cost_per_trip or (v.capacity * 2),
            driver_name=v.driver_name,
        )
        for v in vehicles
    ]

    best = optimize_transport(order.quantity, truck_options)
    alts = get_alternatives(order.quantity, truck_options, exclude_plan=best, max_alternatives=3)

    return {
        "order_id": order_id,
        "required_quantity": order.quantity,
        "alternatives": [
            {
                "trucks": a.trucks,
                "total_capacity": a.total_capacity,
                "total_cost": a.total_cost,
                "trucks_count": a.trucks_count,
                "unused_capacity": a.unused_capacity,
                "reason": a.reason,
            }
            for a in alts
        ],
    }


# ──────────────────── TRUCK STATUS UPDATE ────────────────────

@router.put("/vehicles/{vehicle_id}/status")
async def update_vehicle_status(
    vehicle_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """Update truck status (Admin action). Syncs via WebSocket."""
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    new_status = data.get("status")
    valid_statuses = ["available", "assigned", "picking_up", "in_transit", "delivered", "unavailable"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    old_status = vehicle.status
    vehicle.status = new_status

    # Update linked TruckAllocations
    if new_status in ("picking_up", "in_transit", "delivered"):
        ta_result = await db.execute(
            select(TruckAllocation)
            .where(TruckAllocation.vehicle_id == vehicle_id)
            .where(TruckAllocation.status.notin_(["delivered"]))
        )
        for ta in ta_result.scalars().all():
            ta.status = new_status

            # Update order status based on truck status
            if new_status == "picking_up":
                order = await db.get(Order, ta.order_id)
                if order and order.status == "transport_allocated":
                    order.status = "pickup"
            elif new_status == "in_transit":
                order = await db.get(Order, ta.order_id)
                if order:
                    order.status = "in_transit"
            elif new_status == "delivered":
                order = await db.get(Order, ta.order_id)
                if order:
                    order.status = "delivered"
                # Free vehicle
                vehicle.available_capacity = vehicle.capacity
                vehicle.status = "available"

    # Broadcast
    await manager.broadcast_to_farmer_and_buyer("truck_status_updated", {
        "vehicle_id": vehicle_id,
        "vehicle_number": vehicle.vehicle_number,
        "old_status": old_status,
        "new_status": new_status,
    })

    return {
        "vehicle_id": vehicle_id,
        "vehicle_number": vehicle.vehicle_number,
        "status": new_status,
        "message": f"Truck status updated to {new_status}",
    }


# ──────────────────── ORDERS (full detail) ────────────────────

@router.get("/orders/{order_id}/detail")
async def get_order_detail(order_id: int, db: AsyncSession = Depends(get_db)):
    """Get a full order with buyer, harvest, farmer, and transport details."""
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    buyer = await db.get(Buyer, order.buyer_id)
    harvest = await db.get(Harvest, order.harvest_id) if order.harvest_id else None
    farmer = await db.get(Farmer, harvest.farmer_id) if harvest else None

    # Get transport recommendation
    rec_result = await db.execute(
        select(TransportRecommendation)
        .where(TransportRecommendation.order_id == order_id)
        .order_by(TransportRecommendation.id.desc())
    )
    rec = rec_result.scalars().first()
    transport = None
    if rec:
        ta_result = await db.execute(
            select(TruckAllocation, Vehicle)
            .join(Vehicle, TruckAllocation.vehicle_id == Vehicle.id)
            .where(TruckAllocation.recommendation_id == rec.id)
        )
        trucks = [
            {
                "vehicle_id": v.id,
                "vehicle_number": v.vehicle_number,
                "assigned_capacity": ta.assigned_capacity,
                "cost": ta.cost,
                "status": ta.status,
                "driver_name": v.driver_name,
                "driver_contact": v.driver_contact,
            }
            for ta, v in ta_result.all()
        ]
        transport = {
            "recommendation_id": rec.id,
            "total_cost": rec.total_cost,
            "allocated_capacity": rec.allocated_capacity,
            "trucks_count": rec.trucks_count,
            "reason": rec.reason,
            "trucks": trucks,
        }

    return {
        "id": order.id,
        "status": order.status,
        "quantity": order.quantity,
        "quality_grade": order.quality_grade,
        "delivery_date": order.delivery_date,
        "delivery_location": order.delivery_location,
        "buyer": {"id": buyer.id, "name": buyer.name, "location": buyer.location} if buyer else None,
        "harvest": {
            "id": harvest.id,
            "crop": harvest.crop,
            "quality_grade": harvest.quality_grade,
        } if harvest else None,
        "farmer": {"id": farmer.id, "name": farmer.name, "location": farmer.location} if farmer else None,
        "transport": transport,
    }


@router.get("/orders-extended")
async def list_orders_extended(db: AsyncSession = Depends(get_db)):
    """List all orders with full buyer + harvest + transport details."""
    result = await db.execute(select(Order))
    orders = result.scalars().all()
    out = []
    for order in orders:
        buyer = await db.get(Buyer, order.buyer_id)
        harvest = await db.get(Harvest, order.harvest_id) if order.harvest_id else None
        farmer = await db.get(Farmer, harvest.farmer_id) if harvest else None

        rec_result = await db.execute(
            select(TransportRecommendation)
            .where(TransportRecommendation.order_id == order.id)
            .order_by(TransportRecommendation.id.desc())
        )
        rec = rec_result.scalars().first()
        transport_summary = None
        if rec:
            ta_result = await db.execute(
                select(TruckAllocation, Vehicle)
                .join(Vehicle, TruckAllocation.vehicle_id == Vehicle.id)
                .where(TruckAllocation.recommendation_id == rec.id)
            )
            trucks = [
                {
                    "vehicle_id": v.id,
                    "vehicle_number": v.vehicle_number,
                    "assigned_capacity": ta.assigned_capacity,
                    "cost": ta.cost,
                    "status": ta.status,
                    "driver_name": v.driver_name or "Transporter Fleet",
                    "driver_contact": v.driver_contact or "9876543210",
                }
                for ta, v in ta_result.all()
            ]
            transport_summary = {
                "total_cost": rec.total_cost,
                "allocated_capacity": rec.allocated_capacity,
                "trucks_count": rec.trucks_count,
                "trucks": trucks,
            }

        out.append({
            "id": order.id,
            "status": order.status,
            "quantity": order.quantity,
            "quality_grade": order.quality_grade,
            "delivery_date": order.delivery_date,
            "buyer_name": buyer.name if buyer else None,
            "farmer_name": farmer.name if farmer else None,
            "crop": harvest.crop if harvest else "Tomato",
            "transport": transport_summary,
        })
    return out


# ──────────────────── NOTIFICATIONS ────────────────────

@router.get("/notifications")
async def get_notifications(
    role: str = "farmer",
    db: AsyncSession = Depends(get_db),
):
    """Get all notifications for a role."""
    result = await db.execute(
        select(Notification)
        .where(Notification.role == role)
        .order_by(Notification.id.desc())
    )
    notifs = result.scalars().all()
    return [
        {
            "id": n.id,
            "event": n.event,
            "title": n.title,
            "message": n.message,
            "order_id": n.order_id,
            "is_read": n.is_read,
            "created_at": n.created_at,
        }
        for n in notifs
    ]


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, db: AsyncSession = Depends(get_db)):
    n = await db.get(Notification, notification_id)
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    return {"id": notification_id, "is_read": True}


# ──────────────────── ADMIN DASHBOARD ────────────────────

@router.get("/dashboard/admin")
async def admin_dashboard(db: AsyncSession = Depends(get_db)):
    """Full admin overview."""
    from sqlalchemy import func as sa_func

    farmers_count = (await db.execute(select(sa_func.count(Farmer.id)))).scalar()
    buyers_count = (await db.execute(select(sa_func.count(Buyer.id)))).scalar()
    harvests_total = (await db.execute(select(sa_func.sum(Harvest.estimated_quantity)))).scalar() or 0
    orders_count = (await db.execute(select(sa_func.count(Order.id)))).scalar()

    vehicles_result = await db.execute(select(Vehicle))
    vehicles = vehicles_result.scalars().all()
    total_capacity = sum(v.capacity for v in vehicles)
    available_trucks = [v for v in vehicles if v.status == "available"]
    assigned_trucks = [v for v in vehicles if v.status in ("assigned", "picking_up", "in_transit")]

    orders_result = await db.execute(select(Order))
    all_orders = orders_result.scalars().all()
    active_orders = [o for o in all_orders if o.status not in ("delivered", "rejected", "cancelled")]
    pending_requests = [o for o in all_orders if o.status == "requested"]
    delivered = [o for o in all_orders if o.status == "delivered"]

    return {
        "farmers": farmers_count,
        "buyers": buyers_count,
        "total_harvest_kg": harvests_total,
        "total_orders": orders_count,
        "active_orders": len(active_orders),
        "pending_requests": len(pending_requests),
        "delivered_orders": len(delivered),
        "total_transport_capacity_kg": total_capacity,
        "available_trucks": len(available_trucks),
        "assigned_trucks": len(assigned_trucks),
        "trucks": [
            {
                "id": v.id,
                "vehicle_number": v.vehicle_number,
                "capacity": v.capacity,
                "available_capacity": v.available_capacity,
                "status": v.status,
                "driver_name": v.driver_name,
                "cost_per_trip": v.cost_per_trip,
                "current_location": v.current_location,
            }
            for v in vehicles
        ],
        "recent_orders": [
            {
                "id": o.id,
                "quantity": o.quantity,
                "quality_grade": o.quality_grade,
                "status": o.status,
                "delivery_date": o.delivery_date,
            }
            for o in sorted(all_orders, key=lambda x: x.id, reverse=True)[:10]
        ],
    }
