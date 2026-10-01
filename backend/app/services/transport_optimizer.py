"""
HarvestLink AI — Transport Optimization Service

Hybrid AI architecture:
- This module handles ALL mathematical calculations deterministically.
- The LLM layer is ONLY used for natural-language explanations.

Algorithm:
1. Collect available trucks with capacity and cost.
2. Run a greedy + subset enumeration to find the best combination
   that meets or exceeds required_quantity at minimum cost.
3. Return best combination + alternatives.
4. NEVER allocate more trucks than needed (waste-aware).
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import itertools


@dataclass
class TruckOption:
    vehicle_id: int
    vehicle_number: str
    capacity: float
    available_capacity: float
    cost: float           # cost per trip in INR
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None
    current_location: Optional[str] = None
    status: str = "available"


@dataclass
class TransportPlan:
    trucks: List[Dict[str, Any]]       # list of truck details
    total_capacity: float
    total_cost: float
    trucks_count: int
    unused_capacity: float
    required_quantity: float
    reason: str
    is_exact: bool                     # True if total_capacity == required_quantity


def optimize_transport(
    required_quantity: float,
    available_trucks: List[TruckOption],
    max_combinations: int = 1000,
) -> Optional[TransportPlan]:
    """
    Find the best truck combination to fulfill required_quantity.

    Strategy:
    1. Sort trucks by cost efficiency (capacity/cost ratio, descending).
    2. Use greedy first to get a baseline plan.
    3. Enumerate combinations (capped) to find lower-cost alternatives.
    4. Return the minimum-cost plan that meets or exceeds required_quantity.

    Returns None if no valid combination exists.
    """
    if not available_trucks or required_quantity <= 0:
        return None

    # Filter: only truly available trucks
    trucks = [t for t in available_trucks if t.available_capacity > 0]
    if not trucks:
        return None

    # Sort by capacity descending (greedy preference)
    trucks_sorted = sorted(trucks, key=lambda t: t.available_capacity, reverse=True)

    best_plan: Optional[TransportPlan] = None

    # Try all combinations from size 1 up to min(len(trucks), 8)
    max_size = min(len(trucks), 8)
    checked = 0

    for r in range(1, max_size + 1):
        if checked >= max_combinations:
            break
        for combo in itertools.combinations(trucks_sorted, r):
            checked += 1
            if checked > max_combinations:
                break

            total_cap = sum(t.available_capacity for t in combo)
            total_cost = sum(t.cost for t in combo)

            if total_cap < required_quantity:
                continue  # this combo doesn't satisfy demand

            # This combo is valid — compare with best
            if best_plan is None:
                best_plan = _make_plan(required_quantity, list(combo), total_cap, total_cost)
            else:
                # Prefer lower cost; break ties by fewer trucks; break ties by less unused capacity
                if (
                    total_cost < best_plan.total_cost
                    or (total_cost == best_plan.total_cost and len(combo) < best_plan.trucks_count)
                    or (total_cost == best_plan.total_cost and len(combo) == best_plan.trucks_count
                        and total_cap < best_plan.total_capacity)
                ):
                    best_plan = _make_plan(required_quantity, list(combo), total_cap, total_cost)

    return best_plan


def get_alternatives(
    required_quantity: float,
    available_trucks: List[TruckOption],
    exclude_plan: Optional[TransportPlan] = None,
    max_alternatives: int = 3,
) -> List[TransportPlan]:
    """
    Return up to max_alternatives valid plans different from exclude_plan.
    """
    trucks = [t for t in available_trucks if t.available_capacity > 0]
    if not trucks:
        return []

    trucks_sorted = sorted(trucks, key=lambda t: t.available_capacity, reverse=True)
    valid_plans: List[TransportPlan] = []
    best_ids = set()
    if exclude_plan:
        best_ids = {t["vehicle_id"] for t in exclude_plan.trucks}

    checked = 0
    max_size = min(len(trucks), 8)

    for r in range(1, max_size + 1):
        for combo in itertools.combinations(trucks_sorted, r):
            checked += 1
            if checked > 2000:
                break

            combo_ids = {t.vehicle_id for t in combo}
            if combo_ids == best_ids:
                continue  # same as primary plan

            total_cap = sum(t.available_capacity for t in combo)
            total_cost = sum(t.cost for t in combo)

            if total_cap < required_quantity:
                continue

            plan = _make_plan(required_quantity, list(combo), total_cap, total_cost)

            # Avoid exact duplicates
            already = any(
                {t["vehicle_id"] for t in p.trucks} == combo_ids
                for p in valid_plans
            )
            if not already:
                valid_plans.append(plan)

            if len(valid_plans) >= max_alternatives:
                return valid_plans

    return valid_plans


def _make_plan(
    required_quantity: float,
    combo: List[TruckOption],
    total_cap: float,
    total_cost: float,
) -> TransportPlan:
    unused = total_cap - required_quantity
    is_exact = abs(unused) < 0.01

    if is_exact:
        reason = (
            f"This combination of {len(combo)} truck(s) exactly satisfies the required "
            f"{required_quantity:.0f} kg while minimizing the estimated transport cost of ₹{total_cost:.0f}."
        )
    else:
        reason = (
            f"This combination of {len(combo)} truck(s) provides {total_cap:.0f} kg of capacity "
            f"(+{unused:.0f} kg surplus) to fulfill the {required_quantity:.0f} kg requirement "
            f"at an estimated cost of ₹{total_cost:.0f}. "
            f"No exact match was found with lower cost."
        )

    trucks_detail = [
        {
            "vehicle_id": t.vehicle_id,
            "vehicle_number": t.vehicle_number,
            "capacity": t.capacity,
            "assigned_capacity": t.available_capacity,
            "cost": t.cost,
            "driver_name": t.driver_name,
            "driver_contact": t.driver_contact,
            "current_location": t.current_location,
        }
        for t in combo
    ]

    return TransportPlan(
        trucks=trucks_detail,
        total_capacity=total_cap,
        total_cost=total_cost,
        trucks_count=len(combo),
        unused_capacity=unused,
        required_quantity=required_quantity,
        reason=reason,
        is_exact=is_exact,
    )
