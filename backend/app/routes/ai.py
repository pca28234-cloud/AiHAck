"""
HarvestLink AI — AI Coordination Routes

Endpoints:
- POST /ai/parse-harvest  — Parse natural language harvest input
- POST /ai/match          — Generate AI-powered collection/allocation plan
- POST /ai/what-if        — What-if scenario analysis
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.models import Farmer, Harvest, Buyer, Order, Vehicle, Allocation
from app.schemas.schemas import NLHarvestInput, ParsedHarvest, MatchResult, WhatIfRequest, WhatIfResponse
from app.services.matching import run_matching, SupplyItem, DemandItem, TransportInfo
from app.ai.agent import parse_harvest_nl, generate_ai_explanation, analyze_whatif

router = APIRouter()


async def _gather_data(db: AsyncSession):
    """Gather all active supply, demand, and transport data for matching."""
    # Supply: harvests that are not yet collected
    harvest_result = await db.execute(
        select(Harvest, Farmer)
        .join(Farmer, Harvest.farmer_id == Farmer.id)
        .where(Harvest.status.in_(["estimated", "sorted"]))
    )
    supply = []
    for harvest, farmer in harvest_result.all():
        available = harvest.sorted_quantity if harvest.sorted_quantity is not None else harvest.estimated_quantity
        # Count previous allocations for this farmer
        alloc_count_result = await db.execute(
            select(func.count(Allocation.id))
            .join(Harvest, Allocation.harvest_id == Harvest.id)
            .where(Harvest.farmer_id == farmer.id)
        )
        prev_allocations = alloc_count_result.scalar() or 0

        supply.append(SupplyItem(
            harvest_id=harvest.id,
            farmer_name=farmer.name,
            farmer_id=farmer.id,
            producer_type=farmer.producer_type,
            available_quantity=available,
            quality_grade=harvest.quality_grade,
            previous_allocations=prev_allocations,
            harvest_date=harvest.harvest_date,
        ))

    # Demand: active orders
    order_result = await db.execute(
        select(Order, Buyer)
        .join(Buyer, Order.buyer_id == Buyer.id)
        .where(Order.status == "active")
    )
    demand = []
    for order, buyer in order_result.all():
        demand.append(DemandItem(
            order_id=order.id,
            buyer_name=buyer.name,
            buyer_id=buyer.id,
            quantity=order.quantity,
            quality_grade=order.quality_grade,
            recurring=order.recurring,
        ))

    # Transport: available vehicles
    vehicle_result = await db.execute(
        select(Vehicle).where(Vehicle.status == "available")
    )
    transport = []
    for vehicle in vehicle_result.scalars().all():
        transport.append(TransportInfo(
            vehicle_id=vehicle.id,
            vehicle_number=vehicle.vehicle_number,
            capacity=vehicle.capacity,
            available_capacity=vehicle.available_capacity,
        ))

    return supply, demand, transport


def _format_supply(supply):
    lines = []
    for s in supply:
        lines.append(f"- {s.farmer_name} (ID: {s.harvest_id}): {s.available_quantity} kg, "
                     f"Grade {s.quality_grade}, {s.producer_type} producer, "
                     f"{s.previous_allocations} previous allocations")
    return "\n".join(lines) if lines else "No supply available"


def _format_demand(demand):
    lines = []
    for d in demand:
        recurring_str = f" (recurring)" if d.recurring else ""
        lines.append(f"- {d.buyer_name} (Order {d.order_id}): {d.quantity} kg, "
                     f"Grade {d.quality_grade}{recurring_str}")
    return "\n".join(lines) if lines else "No demand"


def _format_transport(transport):
    lines = []
    for t in transport:
        lines.append(f"- {t.vehicle_number}: {t.available_capacity}/{t.capacity} kg available")
    return "\n".join(lines) if lines else "No transport available"


def _format_allocation(result):
    if not result["allocations"]:
        return "No allocations made"
    lines = []
    for a in result["allocations"]:
        lines.append(f"- {a['farmer_name']} → {a['buyer_name']}: {a['quantity']} kg (Grade {a['quality_grade']})")
    lines.append(f"\nTotal allocated: {result['total_allocated']} kg")
    lines.append(f"Transport used: {result['transport_used']}/{result['transport_capacity']} kg")
    return "\n".join(lines)


# ──────────────────── PARSE HARVEST ────────────────────

@router.post("/parse-harvest")
async def parse_harvest(data: NLHarvestInput, db: AsyncSession = Depends(get_db)):
    """Parse natural language harvest input into structured data."""
    # Verify farmer exists
    farmer = await db.get(Farmer, data.farmer_id)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    result = await parse_harvest_nl(data.text)
    if result is None:
        raise HTTPException(
            status_code=422,
            detail="AI could not parse the input. Please use the manual form instead."
        )

    return {
        "parsed": result,
        "farmer_id": data.farmer_id,
        "farmer_name": farmer.name,
        "message": "Successfully parsed harvest information. Please review and confirm.",
    }


# ──────────────────── AI MATCH ────────────────────

@router.post("/match", response_model=MatchResult)
async def ai_match(db: AsyncSession = Depends(get_db)):
    """Generate an AI-powered collection/allocation plan."""
    supply, demand, transport = await _gather_data(db)

    # Step 1: Run deterministic matching (always works)
    result = run_matching(supply, demand, transport)

    # Step 2: Try to enhance with AI explanation
    try:
        ai_result = await generate_ai_explanation(
            supply_data=_format_supply(supply),
            demand_data=_format_demand(demand),
            transport_data=_format_transport(transport),
            baseline_allocation=_format_allocation(result),
        )

        if ai_result and "explanation" in ai_result:
            # Enhance the deterministic result with AI explanation
            result["explanation"] = ai_result["explanation"]
            if "fairness_assessment" in ai_result:
                result["fairness_notes"].insert(0, ai_result["fairness_assessment"])
            if "concerns" in ai_result:
                for concern in ai_result["concerns"]:
                    if concern:
                        result["fairness_notes"].append(f"💡 {concern}")
            result["method"] = "ai"

    except Exception as e:
        # AI failed — keep deterministic result
        print(f"⚠ AI enhancement failed, using deterministic result: {e}")
        result["fairness_notes"].append("ℹ AI enhancement unavailable — using rule-based allocation")

    return MatchResult(**result)


# ──────────────────── WHAT-IF ────────────────────

@router.post("/what-if", response_model=WhatIfResponse)
async def what_if(data: WhatIfRequest, db: AsyncSession = Depends(get_db)):
    """Analyze a what-if scenario against the current allocation."""
    supply, demand, transport = await _gather_data(db)

    # Get current allocation for context
    current_result = run_matching(supply, demand, transport)

    # Try AI what-if analysis
    ai_result = await analyze_whatif(
        question=data.question,
        supply_data=_format_supply(supply),
        demand_data=_format_demand(demand),
        transport_data=_format_transport(transport),
        current_allocation=_format_allocation(current_result),
    )

    if ai_result:
        return WhatIfResponse(
            question=data.question,
            analysis=ai_result.get("analysis", "Analysis not available."),
            impact_summary=ai_result.get("impact_summary", "Unable to determine impact."),
        )

    # Fallback: provide a basic rule-based response
    return WhatIfResponse(
        question=data.question,
        analysis=(
            f"AI analysis is temporarily unavailable. Based on the current allocation:\n"
            f"• Total supply: {current_result['total_supply']} kg\n"
            f"• Total demand: {current_result['total_demand']} kg\n"
            f"• Currently allocated: {current_result['total_allocated']} kg\n"
            f"• Transport capacity: {current_result['transport_capacity']} kg\n\n"
            f"Any changes to supply, demand, or transport would require re-running "
            f"the allocation engine with updated values."
        ),
        impact_summary="Run the allocation engine with updated values to see the actual impact.",
    )
