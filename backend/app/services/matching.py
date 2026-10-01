"""
HarvestLink AI — Deterministic Matching Engine

This is the CORE business-logic layer. It handles:
- Supply/demand matching with quality constraints
- Transport capacity limits
- Fairness: ensuring small producers get collection opportunities
- All physical/business constraints that the LLM must NEVER override

The AI layer augments this with explanations and NL capabilities,
but this engine is the source of truth for valid allocations.
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class SupplyItem:
    harvest_id: int
    farmer_name: str
    farmer_id: int
    producer_type: str  # "small" or "large"
    available_quantity: float  # sorted_quantity or estimated_quantity
    quality_grade: str  # A, B, C
    previous_allocations: int = 0  # how many times collected before


@dataclass
class DemandItem:
    order_id: int
    buyer_name: str
    buyer_id: int
    quantity: float
    quality_grade: str  # minimum required
    recurring: bool = False
    remaining: float = 0.0  # quantity still needed

    def __post_init__(self):
        self.remaining = self.quantity


@dataclass
class TransportInfo:
    vehicle_id: int
    vehicle_number: str
    capacity: float
    available_capacity: float


@dataclass
class AllocationResult:
    harvest_id: int
    farmer_name: str
    producer_type: str
    order_id: int
    buyer_name: str
    quantity: float
    quality_grade: str
    collection_slot: str = ""


def quality_matches(supply_grade: str, demand_grade: str) -> bool:
    """Check if supply quality meets or exceeds demand requirement.
    Grade hierarchy: A > B > C
    """
    grade_rank = {"A": 3, "B": 2, "C": 1}
    return grade_rank.get(supply_grade, 0) >= grade_rank.get(demand_grade, 0)


def run_matching(
    supply: List[SupplyItem],
    demand: List[DemandItem],
    transport: List[TransportInfo],
    fairness_weight: float = 0.3,
) -> Dict[str, Any]:
    """
    Deterministic matching engine with fairness consideration.

    Algorithm:
    1. Sort supply by fairness priority (small producers first, fewer previous allocations first)
    2. For each demand order, match compatible supply (quality check)
    3. Respect transport capacity
    4. Track collection slots per producer type

    Args:
        supply: available harvests
        demand: buyer orders
        transport: available vehicles
        fairness_weight: 0.0 = pure efficiency, 1.0 = maximum small-producer priority

    Returns:
        Complete allocation result with metrics
    """
    if not supply:
        return _empty_result(supply, demand, transport, "No harvest is currently available for allocation.")

    if not demand:
        return _empty_result(supply, demand, transport, "No active buyer requirements found.")

    if not transport:
        return _empty_result(supply, demand, transport, "No transport vehicles are currently available.")

    # Calculate total transport capacity
    total_transport = sum(t.available_capacity for t in transport)
    if total_transport <= 0:
        return _empty_result(supply, demand, transport, "Available transport capacity is insufficient for the current demand.")

    # ── Step 1: Sort supply with fairness priority ──
    # Small producers first, then by fewer previous allocations, then by available quantity
    def supply_priority(s: SupplyItem) -> tuple:
        type_score = 0 if s.producer_type == "small" else 1
        # Weight the type score by fairness parameter
        weighted_type = type_score * fairness_weight
        return (weighted_type, s.previous_allocations, -s.available_quantity)

    sorted_supply = sorted(supply, key=supply_priority)

    # ── Step 2: Sort demand by urgency (recurring first, then by quantity) ──
    sorted_demand = sorted(demand, key=lambda d: (not d.recurring, -d.quantity))

    # ── Step 3: Allocate ──
    allocations: List[AllocationResult] = []
    remaining_transport = total_transport
    supply_remaining = {s.harvest_id: s.available_quantity for s in sorted_supply}
    slot_counter = 1

    for d in sorted_demand:
        if d.remaining <= 0:
            continue

        for s in sorted_supply:
            if d.remaining <= 0:
                break
            if supply_remaining.get(s.harvest_id, 0) <= 0:
                continue
            if remaining_transport <= 0:
                break

            # Quality check
            if not quality_matches(s.quality_grade, d.quality_grade):
                continue

            # Calculate allocatable quantity
            allocatable = min(
                supply_remaining[s.harvest_id],
                d.remaining,
                remaining_transport,
            )

            if allocatable <= 0:
                continue

            # Create allocation
            allocations.append(AllocationResult(
                harvest_id=s.harvest_id,
                farmer_name=s.farmer_name,
                producer_type=s.producer_type,
                order_id=d.order_id,
                buyer_name=d.buyer_name,
                quantity=round(allocatable, 1),
                quality_grade=s.quality_grade,
                collection_slot=f"Slot {slot_counter}",
            ))

            # Update remaining quantities
            supply_remaining[s.harvest_id] -= allocatable
            d.remaining -= allocatable
            remaining_transport -= allocatable
            slot_counter += 1

    # ── Step 4: Compute metrics ──
    total_supply = sum(s.available_quantity for s in supply)
    total_demand_qty = sum(d.quantity for d in demand)
    total_allocated = sum(a.quantity for a in allocations)

    # Fairness metrics
    allocated_farmer_ids = set()
    small_included = set()
    large_included = set()
    for a in allocations:
        for s in supply:
            if s.harvest_id == a.harvest_id:
                allocated_farmer_ids.add(s.farmer_id)
                if s.producer_type == "small":
                    small_included.add(s.farmer_id)
                else:
                    large_included.add(s.farmer_id)

    total_small = len(set(s.farmer_id for s in supply if s.producer_type == "small"))
    total_large = len(set(s.farmer_id for s in supply if s.producer_type == "large"))

    # Fairness notes
    fairness_notes = []
    if len(small_included) > 0:
        fairness_notes.append(f"✓ {len(small_included)} small producer(s) included in collection")
    if total_small > 0 and len(small_included) == 0:
        fairness_notes.append("⚠ No small producers included — consider adjusting fairness weight")
    if len(small_included) > 0 and len(large_included) > 0:
        fairness_notes.append("✓ Collection distributed across both small and large producers")
    fairness_notes.append("✓ Allocation quantities validated against actual availability")
    fairness_notes.append("✓ Transport capacity respected")

    # Build explanation
    explanation = _build_explanation(
        allocations, supply, demand, transport,
        total_allocated, total_supply, total_demand_qty,
        remaining_transport, small_included, large_included,
    )

    return {
        "allocations": [
            {
                "harvest_id": a.harvest_id,
                "farmer_name": a.farmer_name,
                "producer_type": a.producer_type,
                "order_id": a.order_id,
                "buyer_name": a.buyer_name,
                "quantity": a.quantity,
                "quality_grade": a.quality_grade,
                "collection_slot": a.collection_slot,
            }
            for a in allocations
        ],
        "total_allocated": round(total_allocated, 1),
        "total_supply": round(total_supply, 1),
        "total_demand": round(total_demand_qty, 1),
        "transport_capacity": round(total_transport, 1),
        "transport_used": round(total_allocated, 1),
        "unallocated_supply": round(total_supply - total_allocated, 1),
        "unmet_demand": round(max(0, total_demand_qty - total_allocated), 1),
        "small_producers_included": len(small_included),
        "large_producers_included": len(large_included),
        "total_small_producers": total_small,
        "total_large_producers": total_large,
        "explanation": explanation,
        "fairness_notes": fairness_notes,
        "method": "deterministic",
    }


def _build_explanation(
    allocations, supply, demand, transport,
    total_allocated, total_supply, total_demand,
    remaining_transport, small_included, large_included,
) -> str:
    """Generate a human-readable explanation of the allocation."""
    if not allocations:
        return "No allocations could be made with the current supply, demand, and transport constraints."

    lines = []
    lines.append(f"The matching engine analyzed {len(supply)} harvest(s) totaling {round(total_supply, 1)} kg "
                 f"against {len(demand)} order(s) requiring {round(total_demand, 1)} kg.")

    # Summarize allocations
    for a in allocations:
        lines.append(f"• {a.farmer_name} → {a.buyer_name}: {a.quantity} kg (Grade {a.quality_grade})")

    lines.append(f"\nTotal allocated: {round(total_allocated, 1)} kg of {round(total_supply, 1)} kg available supply.")

    transport_cap = sum(t.available_capacity for t in transport)
    utilization = (total_allocated / transport_cap * 100) if transport_cap > 0 else 0
    lines.append(f"Transport utilization: {round(total_allocated, 1)}/{round(transport_cap, 1)} kg ({round(utilization, 1)}%)")

    if total_demand > total_allocated:
        lines.append(f"\n⚠ Unmet demand: {round(total_demand - total_allocated, 1)} kg could not be allocated "
                     f"due to supply or transport constraints.")

    if small_included:
        lines.append(f"\n✓ Fairness: {len(small_included)} small producer(s) received collection slots, "
                     f"ensuring distributed access.")

    return "\n".join(lines)


def _empty_result(supply, demand, transport, explanation: str) -> Dict[str, Any]:
    """Return an empty result with the given explanation."""
    total_supply = sum(s.available_quantity for s in supply) if supply else 0
    total_demand_qty = sum(d.quantity for d in demand) if demand else 0
    total_transport = sum(t.available_capacity for t in transport) if transport else 0

    return {
        "allocations": [],
        "total_allocated": 0,
        "total_supply": round(total_supply, 1),
        "total_demand": round(total_demand_qty, 1),
        "transport_capacity": round(total_transport, 1),
        "transport_used": 0,
        "unallocated_supply": round(total_supply, 1),
        "unmet_demand": round(total_demand_qty, 1),
        "small_producers_included": 0,
        "large_producers_included": 0,
        "total_small_producers": len(set(s.farmer_id for s in supply if s.producer_type == "small")) if supply else 0,
        "total_large_producers": len(set(s.farmer_id for s in supply if s.producer_type == "large")) if supply else 0,
        "explanation": explanation,
        "fairness_notes": [f"⚠ {explanation}"],
        "method": "deterministic",
    }
