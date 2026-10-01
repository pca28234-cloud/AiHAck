"""
HarvestLink AI — Orders, BuyerRequests, Transport & Notifications Routes

This module handles the full flow:
  Buyer sends request → Farmer accepts/rejects → AI recommends trucks → Trucks allocated
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.models import (
    Farmer, Harvest, Buyer, Order, BuyerRequest,
    Vehicle, TransportRecommendation, TruckAllocation, Notification, Allocation,
    CancellationHistory
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
    """List harvests available for buyers to request (estimated or sorted status with positive available quantity)."""
    result = await db.execute(
        select(Harvest, Farmer)
        .join(Farmer, Harvest.farmer_id == Farmer.id)
        .where(Harvest.status.in_(["estimated", "sorted"]))
    )
    harvests = []
    for harvest, farmer in result.all():
        if harvest.available_quantity <= 0:
            continue
        harvests.append({
            "id": harvest.id,
            "farmer_id": harvest.farmer_id,
            "farmer_name": farmer.name,
            "farmer_location": farmer.location,
            "crop": harvest.crop,
            "estimated_quantity": harvest.estimated_quantity,
            "sorted_quantity": harvest.sorted_quantity,
            "reserved_quantity": harvest.reserved_quantity or 0.0,
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
    if harvest.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot request a cancelled harvest")

    requested_qty = float(quantity)
    if requested_qty > harvest.available_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Requested quantity ({requested_qty}) exceeds available supply ({harvest.available_quantity})"
        )

    # Reserve the quantity on the harvest
    harvest.reserved_quantity = (harvest.reserved_quantity or 0.0) + requested_qty
    if harvest.available_quantity <= 0:
        harvest.status = "allocated"

    # Create an Order record too (status=requested)
    order = Order(
        buyer_id=buyer_id,
        harvest_id=harvest_id,
        quantity=requested_qty,
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
        quantity=requested_qty,
        quality_grade=quality_grade.upper(),
        delivery_date=delivery_date,
        delivery_location=delivery_location,
        message=message,
        status="pending",
        created_at=_now(),
    )
    db.add(br)
    await db.commit()
    await db.refresh(br)

    # Notify farmer via WebSocket
    await _notify(
        db, "farmer", "buyer_request_created",
        "New Buyer Request",
        f"{buyer.name} requested {quantity} Grade {quality_grade} — {harvest.crop}.",
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
        f"Your order #{order_id} for {order.quantity} Grade {order.quality_grade} has been accepted.",
        order_id=order_id,
        user_id=order.buyer_id,
    )

    # Auto-trigger transport recommendation
    recommendation = await _run_transport_agent(order_id, db)
    await db.commit()

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

    # Release reserved harvest quantity
    harvest = await db.get(Harvest, order.harvest_id) if order.harvest_id else None
    if harvest:
        harvest.reserved_quantity = max(0.0, (harvest.reserved_quantity or 0.0) - order.quantity)
        if harvest.status == "allocated" and harvest.available_quantity > 0:
            harvest.status = "sorted" if harvest.sorted_quantity is not None else "estimated"

    br_result = await db.execute(
        select(BuyerRequest).where(BuyerRequest.order_id == order_id)
    )
    for br in br_result.scalars().all():
        br.status = "rejected"

    await db.commit()

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


# ──────────────────── ORDER & REQUEST CANCELLATIONS ────────────────────

@router.post("/orders/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    data: dict = Body(default={}),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel an active order (Farmer or Buyer action).
    - Restores reserved harvest quantity to farmer inventory.
    - Frees assigned trucks if transport was allocated before pickup.
    - Cancels linked buyer request and recommendations.
    - Enforces status rules (cannot cancel once picked up/in transit/delivered).
    - Logs into CancellationHistory (Admin History).
    - Emits real-time WebSocket events.
    """
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Enforce status rules
    if order.status in ("picked_up", "in_transit", "delivered"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel order #{order_id}: Produce has already been collected/picked up by transporter (Status: {order.status})."
        )
    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail=f"Order #{order_id} is already cancelled.")

    prev_status = order.status
    reason = data.get("reason", "").strip() or "Cancelled by user"
    cancelled_by = data.get("cancelled_by", "").strip() or data.get("username", "").strip() or "User"
    user_role = data.get("role", "").strip() or "user"

    # 1. Update order
    order.status = "cancelled"
    order.cancelled_at = _now()
    order.cancelled_by = f"{cancelled_by} ({user_role})"
    order.cancellation_reason = reason

    # 2. Release reserved harvest quantity back to farmer
    restored_qty = 0.0
    harvest = await db.get(Harvest, order.harvest_id) if order.harvest_id else None
    if harvest:
        restored_qty = order.quantity
        harvest.reserved_quantity = max(0.0, (harvest.reserved_quantity or 0.0) - order.quantity)
        if harvest.status == "allocated" and harvest.available_quantity > 0:
            harvest.status = "sorted" if harvest.sorted_quantity is not None else "estimated"

    # 3. Cancel linked BuyerRequest
    br_result = await db.execute(
        select(BuyerRequest).where(BuyerRequest.order_id == order_id)
    )
    for br in br_result.scalars().all():
        br.status = "cancelled"
        br.cancelled_at = _now()
        br.cancellation_reason = reason

    # 4. Cancel transport recommendation and free assigned trucks
    rec_result = await db.execute(
        select(TransportRecommendation).where(TransportRecommendation.order_id == order_id)
    )
    for rec in rec_result.scalars().all():
        rec.status = "cancelled"
        ta_result = await db.execute(
            select(TruckAllocation).where(TruckAllocation.recommendation_id == rec.id)
        )
        for ta in ta_result.scalars().all():
            ta.status = "cancelled"
            v = await db.get(Vehicle, ta.vehicle_id)
            if v:
                v.status = "available"
                v.available_capacity = v.capacity

    # 5. Cancel any legacy Allocation
    alloc_result = await db.execute(
        select(Allocation).where(Allocation.order_id == order_id)
    )
    for a in alloc_result.scalars().all():
        a.status = "cancelled"

    # 6. Fetch participants for audit and notifications
    buyer = await db.get(Buyer, order.buyer_id)
    farmer = await db.get(Farmer, harvest.farmer_id) if (harvest and harvest.farmer_id) else None

    # 7. Record in CancellationHistory for Admin audit
    history_entry = CancellationHistory(
        cancellation_type="order",
        order_id=order.id,
        harvest_id=harvest.id if harvest else None,
        user_role=user_role,
        username=cancelled_by,
        farmer_name=farmer.name if farmer else "Farmer",
        buyer_name=buyer.name if buyer else "Buyer",
        crop=harvest.crop if harvest else "Tomato",
        quality_grade=order.quality_grade,
        quantity=order.quantity,
        previous_status=prev_status,
        cancelled_status="cancelled",
        reason=reason,
        restored_quantity=restored_qty,
        created_at=_now(),
    )
    db.add(history_entry)
    await db.commit()

    # 8. Notifications
    if farmer:
        await _notify(
            db, "farmer", "order_cancelled",
            "Order Cancelled",
            f"Order #ORD{order.id:03d} ({order.quantity} Grade {order.quality_grade}) was cancelled by {cancelled_by}. {restored_qty} has been released back to your available inventory.",
            order_id=order.id,
            user_id=farmer.id,
        )
    if buyer:
        await _notify(
            db, "buyer", "order_cancelled",
            "Order Cancelled",
            f"Order #ORD{order.id:03d} for {order.quantity} Grade {order.quality_grade} was cancelled by {cancelled_by}. Reason: {reason}.",
            order_id=order.id,
            user_id=buyer.id,
        )
    await _notify(
        db, "admin", "order_cancelled",
        f"Order #ORD{order.id:03d} Cancelled",
        f"Order #ORD{order.id:03d} cancelled by {cancelled_by} ({user_role}). Previous: {prev_status}. Restored: {restored_qty}.",
        order_id=order.id,
    )

    # 9. Real-time WebSocket broadcasts
    payload = {
        "order_id": order.id,
        "order_code": f"ORD{order.id:03d}",
        "previous_status": prev_status,
        "status": "cancelled",
        "cancelled_by": cancelled_by,
        "reason": reason,
        "restored_quantity": restored_qty,
        "harvest_id": harvest.id if harvest else None,
    }
    await manager.broadcast_to_all("order_cancelled", payload)
    await manager.broadcast_to_all("order_status_updated", payload)
    if harvest:
        await manager.broadcast_to_all("harvest_updated", {
            "id": harvest.id,
            "farmer_id": harvest.farmer_id,
            "farmer_name": farmer.name if farmer else None,
            "crop": harvest.crop,
            "quantity": harvest.available_quantity,
            "available_quantity": harvest.available_quantity,
            "quality_grade": harvest.quality_grade,
            "status": harvest.status,
        })

    return {
        "success": True,
        "order_id": order.id,
        "status": "cancelled",
        "previous_status": prev_status,
        "restored_quantity": restored_qty,
        "message": f"Order #ORD{order.id:03d} successfully cancelled. {restored_qty} released back to inventory.",
    }


@router.post("/buyer-requests/{request_id}/cancel")
async def cancel_buyer_request(
    request_id: int,
    data: dict = Body(default={}),
    db: AsyncSession = Depends(get_db),
):
    """
    Buyer cancels an active crop request.
    If linked to an order, cascades to order cancellation.
    """
    br = await db.get(BuyerRequest, request_id)
    if not br:
        raise HTTPException(status_code=404, detail="Buyer request not found")

    if br.status == "cancelled":
        raise HTTPException(status_code=400, detail="Request is already cancelled")

    # If linked to an order, cancel the order too
    if br.order_id:
        return await cancel_order(br.order_id, data=data, db=db)

    prev_status = br.status
    reason = data.get("reason", "").strip() or "Cancelled by buyer"
    cancelled_by = data.get("cancelled_by", "").strip() or data.get("username", "").strip() or "buyer1"

    br.status = "cancelled"
    br.cancelled_at = _now()
    br.cancellation_reason = reason

    # Release reserved harvest quantity
    restored_qty = 0.0
    harvest = await db.get(Harvest, br.harvest_id)
    if harvest:
        restored_qty = br.quantity
        harvest.reserved_quantity = max(0.0, (harvest.reserved_quantity or 0.0) - br.quantity)
        if harvest.status == "allocated" and harvest.available_quantity > 0:
            harvest.status = "sorted" if harvest.sorted_quantity is not None else "estimated"

    buyer = await db.get(Buyer, br.buyer_id)
    farmer = await db.get(Farmer, harvest.farmer_id) if (harvest and harvest.farmer_id) else None

    history_entry = CancellationHistory(
        cancellation_type="request",
        request_id=br.id,
        harvest_id=harvest.id if harvest else None,
        user_role="buyer",
        username=cancelled_by,
        farmer_name=farmer.name if farmer else "Farmer",
        buyer_name=buyer.name if buyer else "Buyer",
        crop=harvest.crop if harvest else "Tomato",
        quality_grade=br.quality_grade,
        quantity=br.quantity,
        previous_status=prev_status,
        cancelled_status="cancelled",
        reason=reason,
        restored_quantity=restored_qty,
        created_at=_now(),
    )
    db.add(history_entry)
    await db.commit()

    await manager.broadcast_to_all("buyer_request_cancelled", {
        "request_id": br.id,
        "harvest_id": br.harvest_id,
        "buyer_id": br.buyer_id,
        "status": "cancelled",
    })
    if harvest:
        await manager.broadcast_to_all("harvest_updated", {
            "id": harvest.id,
            "farmer_id": harvest.farmer_id,
            "crop": harvest.crop,
            "quantity": harvest.available_quantity,
            "available_quantity": harvest.available_quantity,
            "status": harvest.status,
        })

    return {
        "success": True,
        "request_id": br.id,
        "status": "cancelled",
        "restored_quantity": restored_qty,
        "message": f"Buyer request #{br.id} successfully cancelled.",
    }


@router.post("/harvests/{harvest_id}/cancel")
async def cancel_harvest(
    harvest_id: int,
    data: dict = Body(default={}),
    db: AsyncSession = Depends(get_db),
):
    """
    Farmer cancels/deletes an active harvest.
    - Prevents cancellation if produce has already been picked up or delivered.
    - Cancels any pending orders and requests.
    - Removes from AI matching queue and buyer available list.
    - Logs into CancellationHistory.
    """
    harvest = await db.get(Harvest, harvest_id)
    if not harvest:
        raise HTTPException(status_code=404, detail="Harvest not found")
    if harvest.status == "cancelled":
        raise HTTPException(status_code=400, detail="Harvest is already cancelled")

    # Disallow if any linked order was already picked up or in transit
    active_orders = await db.execute(
        select(Order)
        .where(Order.harvest_id == harvest_id)
        .where(Order.status.in_(["picked_up", "in_transit", "delivered"]))
    )
    if active_orders.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel harvest: Orders from this harvest have already been picked up or delivered by a transporter."
        )

    prev_status = harvest.status
    reason = data.get("reason", "").strip() or "Cancelled by farmer"
    cancelled_by = data.get("cancelled_by", "").strip() or data.get("username", "").strip() or "Farmer"

    # Cancel all pending/accepted orders for this harvest
    pending_orders = await db.execute(
        select(Order)
        .where(Order.harvest_id == harvest_id)
        .where(Order.status.notin_(["cancelled", "delivered", "rejected"]))
    )
    for o in pending_orders.scalars().all():
        o.status = "cancelled"
        o.cancelled_at = _now()
        o.cancelled_by = cancelled_by
        o.cancellation_reason = f"Harvest cancelled: {reason}"

        # Free trucks
        rec_result = await db.execute(
            select(TransportRecommendation).where(TransportRecommendation.order_id == o.id)
        )
        for rec in rec_result.scalars().all():
            rec.status = "cancelled"
            tas = await db.execute(
                select(TruckAllocation).where(TruckAllocation.recommendation_id == rec.id)
            )
            for ta in tas.scalars().all():
                ta.status = "cancelled"
                v = await db.get(Vehicle, ta.vehicle_id)
                if v:
                    v.status = "available"
                    v.available_capacity = v.capacity

    # Cancel pending buyer requests
    brs = await db.execute(
        select(BuyerRequest)
        .where(BuyerRequest.harvest_id == harvest_id)
        .where(BuyerRequest.status.in_(["pending", "accepted"]))
    )
    for br in brs.scalars().all():
        br.status = "cancelled"
        br.cancelled_at = _now()
        br.cancellation_reason = f"Harvest cancelled: {reason}"

    harvest.status = "cancelled"
    harvest.cancelled_at = _now()
    harvest.cancellation_reason = reason
    harvest.reserved_quantity = 0.0

    farmer = await db.get(Farmer, harvest.farmer_id)

    history_entry = CancellationHistory(
        cancellation_type="harvest",
        harvest_id=harvest.id,
        user_role="farmer",
        username=cancelled_by,
        farmer_name=farmer.name if farmer else "Farmer",
        buyer_name="All Buyers",
        crop=harvest.crop,
        quality_grade=harvest.quality_grade,
        quantity=harvest.estimated_quantity,
        previous_status=prev_status,
        cancelled_status="cancelled",
        reason=reason,
        restored_quantity=0.0,
        created_at=_now(),
    )
    db.add(history_entry)
    await db.commit()

    await manager.broadcast_to_all("harvest_cancelled", {
        "harvest_id": harvest.id,
        "farmer_id": harvest.farmer_id,
        "crop": harvest.crop,
    })
    await manager.broadcast_to_all("order_cancelled", {
        "harvest_id": harvest.id,
        "reason": reason,
    })

    return {
        "success": True,
        "harvest_id": harvest.id,
        "status": "cancelled",
        "message": "Harvest cancelled successfully and removed from active listings.",
    }


@router.get("/admin/cancellations")
async def list_cancellations(db: AsyncSession = Depends(get_db)):
    """Get all cancellation audit history records for the Admin panel."""
    result = await db.execute(
        select(CancellationHistory).order_by(CancellationHistory.id.desc())
    )
    return result.scalars().all()


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
    await db.commit()

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
        f"AI assigned {plan.trucks_count} truck(s) for order #{order_id}. Total capacity: {plan.total_capacity:.0f}. Cost: ₹{plan.total_cost:.0f}.",
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
    if new_status == "available":
        vehicle.available_capacity = vehicle.capacity

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

    await db.commit()

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


# ──────────────────── TRANSPORTER JOBS & STATUS ────────────────────

@router.get("/transport/jobs")
async def list_transporter_jobs(db: AsyncSession = Depends(get_db)):
    """List all transport jobs for the transporter dashboard."""
    result = await db.execute(
        select(Order)
        .where(Order.status.in_(["accepted", "transport_allocated", "pickup", "pickup_started", "picked_up", "in_transit", "delivered"]))
        .order_by(Order.id.desc())
    )
    orders = result.scalars().all()
    jobs = []
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
        trucks = []
        if rec:
            ta_result = await db.execute(
                select(TruckAllocation, Vehicle)
                .join(Vehicle, TruckAllocation.vehicle_id == Vehicle.id)
                .where(TruckAllocation.recommendation_id == rec.id)
            )
            for ta, v in ta_result.all():
                trucks.append({
                    "truck_id": v.id,
                    "truck_number": v.vehicle_number,
                    "assigned_capacity": ta.assigned_capacity,
                    "capacity": v.capacity,
                    "cost": ta.cost,
                    "driver_name": v.driver_name,
                    "driver_contact": v.driver_contact,
                    "status": ta.status,
                })

        jobs.append({
            "order_id": order.id,
            "order_code": f"ORD{order.id:03d}",
            "status": order.status,
            "display_status": order.status.replace("_", " ").upper(),
            "crop": harvest.crop if harvest else "Tomato",
            "quantity": order.quantity,
            "quality_grade": order.quality_grade,
            "farmer": {
                "name": farmer.name if farmer else "Farmer",
                "username": getattr(farmer, "username", "farmer1"),
                "farm_name": getattr(farmer, "farm_name", "Green Valley Farm"),
                "pickup_location": farmer.location if farmer else (order.delivery_location or "Karnataka"),
                "phone": farmer.phone if farmer else "9876543210",
            },
            "buyer": {
                "name": buyer.name if buyer else "ABC Restaurant",
                "delivery_location": order.delivery_location or (buyer.location if buyer else "Bangalore"),
                "phone": buyer.phone if buyer else "9445566778",
            },
            "pickup_time": "Today, 08:00 AM",
            "delivery_time": order.delivery_date,
            "assigned_trucks": trucks,
            "total_cost": rec.total_cost if rec else 0,
            "total_capacity": rec.allocated_capacity if rec else 0,
        })
    return jobs


@router.post("/transport/orders/{order_id}/update-status")
async def update_transport_order_status(
    order_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Transporter updates job status:
    ASSIGNED, PICKUP STARTED, PICKED UP, IN TRANSIT, DELIVERED
    Saves to DB, updates trucks, broadcasts to farmer, buyer, transporter, and admin.
    """
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    raw_status = data.get("status", "").strip()
    status_map = {
        "assigned": "transport_allocated",
        "pickup started": "pickup_started",
        "pickup_started": "pickup_started",
        "picking_up": "pickup_started",
        "pickup": "pickup_started",
        "picked up": "picked_up",
        "picked_up": "picked_up",
        "in transit": "in_transit",
        "in_transit": "in_transit",
        "delivered": "delivered",
    }
    normalized = status_map.get(raw_status.lower(), raw_status.lower().replace(" ", "_"))
    display_title = raw_status.title()

    order.status = normalized

    # Update linked truck allocations & vehicles
    rec_result = await db.execute(
        select(TransportRecommendation).where(TransportRecommendation.order_id == order_id)
    )
    rec = rec_result.scalars().first()
    if rec:
        ta_result = await db.execute(
            select(TruckAllocation).where(TruckAllocation.recommendation_id == rec.id)
        )
        for ta in ta_result.scalars().all():
            ta.status = normalized
            v = await db.get(Vehicle, ta.vehicle_id)
            if v:
                if normalized == "delivered":
                    v.status = "available"
                    v.available_capacity = v.capacity
                else:
                    v.status = normalized

    await db.commit()

    # Fetch participants for notification
    buyer = await db.get(Buyer, order.buyer_id)
    harvest = await db.get(Harvest, order.harvest_id) if order.harvest_id else None
    farmer = await db.get(Farmer, harvest.farmer_id) if harvest else None

    # Broadcast real-time event to all connected dashboards
    payload = {
        "order_id": order.id,
        "order_code": f"ORD{order.id:03d}",
        "status": normalized,
        "display_status": raw_status.upper(),
        "timestamp": _now(),
    }
    await manager.broadcast_to_all("truck_status_updated", payload)
    await manager.broadcast_to_all("order_status_updated", payload)

    # Add DB notifications for farmer and buyer
    if farmer:
        await _notify(
            db, "farmer", "truck_status_updated",
            f"🚛 Transport Update: {display_title}",
            f"Order #ORD{order.id:03d} transport status changed to {raw_status.upper()}.",
            order_id=order.id,
            user_id=farmer.id,
        )
    if buyer:
        await _notify(
            db, "buyer", "truck_status_updated",
            f"🚛 Delivery Update: {display_title}",
            f"Order #ORD{order.id:03d} transport status changed to {raw_status.upper()}.",
            order_id=order.id,
            user_id=buyer.id,
        )
    await _notify(
        db, "admin", "truck_status_updated",
        f"Order #ORD{order.id:03d} {raw_status.upper()}",
        f"Transport status updated for Order #{order.id} to {raw_status.upper()}.",
        order_id=order.id,
    )

    return {
        "order_id": order.id,
        "status": normalized,
        "display_status": raw_status.upper(),
        "message": f"Transport status successfully updated to {raw_status.upper()}",
    }


# ──────────────────── ORDERS (full detail) ────────────────────

@router.get("/orders/{order_id}/detail")
async def get_order_detail(order_id: int, db: AsyncSession = Depends(get_db)):
    """Get a full connected order with farmer, buyer, transporter, transport details, and timeline."""
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
    trucks = []
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
                "capacity": v.capacity,
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
            "allocation_time": rec.created_at,
            "trucks": trucks,
        }

    # Timeline calculation
    st = order.status
    stages = [
        {"name": "Harvest Added", "done": True, "active": False},
        {"name": "Buyer Request Created", "done": True, "active": False},
        {"name": "Farmer Accepted", "done": st in ["accepted", "transport_allocated", "pickup", "pickup_started", "picked_up", "in_transit", "delivered"], "active": st == "accepted"},
        {"name": "AI Transport Recommended", "done": st in ["transport_allocated", "pickup", "pickup_started", "picked_up", "in_transit", "delivered"], "active": False},
        {"name": "Transport Allocated", "done": st in ["transport_allocated", "pickup", "pickup_started", "picked_up", "in_transit", "delivered"], "active": st == "transport_allocated"},
        {"name": "Pickup Started", "done": st in ["pickup_started", "picked_up", "in_transit", "delivered"], "active": st in ["pickup", "pickup_started"]},
        {"name": "In Transit", "done": st in ["picked_up", "in_transit", "delivered"], "active": st in ["picked_up", "in_transit"]},
        {"name": "Delivered", "done": st == "delivered", "active": st == "delivered"},
    ]
    if st == "cancelled":
        stages.append({
            "name": "Order Cancelled",
            "done": True,
            "active": True,
            "is_cancelled": True,
        })

    return {
        "id": order.id,
        "order_code": f"ORD{order.id:03d}",
        "status": order.status,
        "display_status": order.status.replace("_", " ").upper(),
        "quantity": order.quantity,
        "quality_grade": order.quality_grade,
        "delivery_date": order.delivery_date,
        "delivery_location": order.delivery_location or (buyer.location if buyer else ""),
        "cancellation": {
            "cancelled_at": getattr(order, "cancelled_at", None),
            "cancelled_by": getattr(order, "cancelled_by", None),
            "reason": getattr(order, "cancellation_reason", None),
        } if st == "cancelled" else None,
        "farmer": {
            "id": farmer.id if farmer else None,
            "username": getattr(farmer, "username", "farmer1"),
            "name": farmer.name if farmer else "Farmer",
            "farm_name": getattr(farmer, "farm_name", "Farm"),
            "location": farmer.location if farmer else "",
            "contact": farmer.phone if farmer else "",
            "harvest_quantity": harvest.estimated_quantity if harvest else order.quantity,
            "quality": harvest.quality_grade if harvest else order.quality_grade,
            "harvest_date": harvest.harvest_date if harvest else order.delivery_date,
        },
        "buyer": {
            "id": buyer.id if buyer else None,
            "username": getattr(buyer, "username", "buyer1"),
            "name": buyer.name if buyer else "ABC Restaurant",
            "contact": buyer.contact or (buyer.phone if buyer else ""),
            "delivery_location": order.delivery_location or (buyer.location if buyer else ""),
            "requested_quantity": order.quantity,
            "order_date": order.delivery_date,
        },
        "transporter": {
            "name": "Raj Transport Services",
            "contact": "Rajesh Singh (9822098765)",
            "vehicle_details": f"{len(trucks)} Truck(s) Assigned",
            "assigned_trucks": [t["vehicle_number"] for t in trucks],
            "pickup_time": "Today, 08:00 AM",
            "delivery_time": order.delivery_date,
        },
        "harvest": {
            "id": harvest.id if harvest else None,
            "crop": harvest.crop if harvest else "Tomato",
            "quality_grade": harvest.quality_grade if harvest else order.quality_grade,
        },
        "transport": transport,
        "timeline": stages,
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
            "order_code": f"ORD{order.id:03d}",
            "status": order.status,
            "display_status": order.status.replace("_", " ").upper(),
            "quantity": order.quantity,
            "quality_grade": order.quality_grade,
            "delivery_date": order.delivery_date,
            "delivery_location": order.delivery_location or (buyer.location if buyer else ""),
            "buyer_id": order.buyer_id,
            "buyer_name": buyer.name if buyer else "ABC Restaurant",
            "farmer_id": farmer.id if farmer else None,
            "farmer_name": farmer.name if farmer else "Farmer",
            "farmer_username": getattr(farmer, "username", "farmer1"),
            "farmer_location": farmer.location if farmer else "",
            "transporter_name": "Raj Transport Services",
            "crop": harvest.crop if harvest else "Tomato",
            "cancelled_at": getattr(order, "cancelled_at", None),
            "cancelled_by": getattr(order, "cancelled_by", None),
            "cancellation_reason": getattr(order, "cancellation_reason", None),
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
