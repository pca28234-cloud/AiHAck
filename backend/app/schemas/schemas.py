"""
HarvestLink AI — Pydantic Schemas for request/response validation
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date


# ──────────────────── FARMER ────────────────────

class FarmerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    location: str = Field(..., min_length=1, max_length=200)
    farm_size: float = Field(..., gt=0, description="Farm size in hectares")
    producer_type: str = Field(..., description="'small' or 'large'")
    pan_card: Optional[str] = Field(None, max_length=10, description="PAN card number")
    land_location: Optional[str] = Field(None, max_length=300, description="Detailed land address or GPS coordinates")
    phone: Optional[str] = Field(None, max_length=15, description="Contact phone number")
    email: Optional[str] = Field(None, max_length=100, description="Contact email")
    aadhaar_last4: Optional[str] = Field(None, max_length=4, description="Last 4 digits of Aadhaar")

    @field_validator("producer_type")
    @classmethod
    def validate_producer_type(cls, v):
        if v.lower() not in ("small", "large"):
            raise ValueError("producer_type must be 'small' or 'large'")
        return v.lower()

    @field_validator("pan_card")
    @classmethod
    def validate_pan_card(cls, v):
        if v is not None:
            import re
            if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]$', v.upper()):
                raise ValueError("Invalid PAN card format (expected: ABCDE1234F)")
            return v.upper()
        return v


class FarmerResponse(BaseModel):
    id: int
    name: str
    location: str
    farm_size: float
    producer_type: str
    pan_card: Optional[str] = None
    land_location: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    aadhaar_last4: Optional[str] = None

    class Config:
        from_attributes = True


# ──────────────────── HARVEST ────────────────────

class HarvestCreate(BaseModel):
    farmer_id: int
    crop: str = Field(default="Tomato", max_length=50)
    estimated_quantity: float = Field(..., gt=0, description="Estimated quantity in kg")
    sorted_quantity: Optional[float] = Field(None, ge=0, description="Sorted quantity in kg")
    quality_grade: str = Field(..., description="Quality grade: A, B, or C")
    harvest_date: str = Field(..., description="Harvest date (YYYY-MM-DD)")
    status: str = Field(default="estimated")

    @field_validator("quality_grade")
    @classmethod
    def validate_quality_grade(cls, v):
        if v.upper() not in ("A", "B", "C"):
            raise ValueError("quality_grade must be 'A', 'B', or 'C'")
        return v.upper()

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid = ("estimated", "sorted", "allocated", "collected")
        if v.lower() not in valid:
            raise ValueError(f"status must be one of {valid}")
        return v.lower()


class HarvestUpdate(BaseModel):
    sorted_quantity: Optional[float] = Field(None, ge=0)
    quality_grade: Optional[str] = None
    status: Optional[str] = None
    estimated_quantity: Optional[float] = Field(None, gt=0)

    @field_validator("quality_grade")
    @classmethod
    def validate_quality_grade(cls, v):
        if v is not None and v.upper() not in ("A", "B", "C"):
            raise ValueError("quality_grade must be 'A', 'B', or 'C'")
        return v.upper() if v else v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            valid = ("estimated", "sorted", "allocated", "collected")
            if v.lower() not in valid:
                raise ValueError(f"status must be one of {valid}")
            return v.lower()
        return v


class HarvestResponse(BaseModel):
    id: int
    farmer_id: int
    crop: str
    estimated_quantity: float
    sorted_quantity: Optional[float]
    quality_grade: str
    harvest_date: str
    status: str
    farmer_name: Optional[str] = None
    farmer_location: Optional[str] = None
    producer_type: Optional[str] = None

    class Config:
        from_attributes = True


# ──────────────────── BUYER ────────────────────

class BuyerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    location: str = Field(..., min_length=1, max_length=200)
    contact: Optional[str] = Field(None, max_length=100)


class BuyerResponse(BaseModel):
    id: int
    name: str
    location: str
    contact: Optional[str]

    class Config:
        from_attributes = True


# ──────────────────── ORDER ────────────────────

class OrderCreate(BaseModel):
    buyer_id: int
    quantity: float = Field(..., gt=0, description="Required quantity in kg")
    quality_grade: str = Field(..., description="Required quality grade: A, B, or C")
    delivery_date: str = Field(..., description="Delivery date (YYYY-MM-DD)")
    recurring: bool = Field(default=False)
    frequency: str = Field(default="none", description="'daily', 'weekly', or 'none'")
    status: str = Field(default="active")

    @field_validator("quality_grade")
    @classmethod
    def validate_quality_grade(cls, v):
        if v.upper() not in ("A", "B", "C"):
            raise ValueError("quality_grade must be 'A', 'B', or 'C'")
        return v.upper()

    @field_validator("frequency")
    @classmethod
    def validate_frequency(cls, v):
        valid = ("daily", "weekly", "none")
        if v.lower() not in valid:
            raise ValueError(f"frequency must be one of {valid}")
        return v.lower()


class OrderResponse(BaseModel):
    id: int
    buyer_id: int
    quantity: float
    quality_grade: str
    delivery_date: str
    recurring: bool
    frequency: str
    status: str
    buyer_name: Optional[str] = None

    class Config:
        from_attributes = True


# ──────────────────── VEHICLE ────────────────────

class VehicleCreate(BaseModel):
    vehicle_number: str = Field(..., min_length=1, max_length=50)
    capacity: float = Field(..., gt=0, description="Total capacity in kg")
    available_capacity: float = Field(..., ge=0, description="Available capacity in kg")
    availability_date: str = Field(..., description="Availability date (YYYY-MM-DD)")
    status: str = Field(default="available")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid = ("available", "in_use", "maintenance")
        if v.lower() not in valid:
            raise ValueError(f"status must be one of {valid}")
        return v.lower()


class VehicleResponse(BaseModel):
    id: int
    vehicle_number: str
    capacity: float
    available_capacity: float
    availability_date: str
    status: str

    class Config:
        from_attributes = True


# ──────────────────── AI ────────────────────

class NLHarvestInput(BaseModel):
    text: str = Field(..., min_length=5, description="Natural language harvest description")
    farmer_id: int


class ParsedHarvest(BaseModel):
    estimated_quantity: float = Field(..., gt=0)
    expected_sorted_quantity: Optional[float] = Field(None, ge=0)
    quality_grade: str
    availability: Optional[str] = None


class AllocationItem(BaseModel):
    harvest_id: int
    farmer_name: str
    producer_type: str
    order_id: int
    buyer_name: str
    quantity: float = Field(..., gt=0)
    quality_grade: str
    collection_slot: Optional[str] = None


class MatchResult(BaseModel):
    allocations: List[AllocationItem]
    total_allocated: float
    total_supply: float
    total_demand: float
    transport_capacity: float
    transport_used: float
    unallocated_supply: float
    unmet_demand: float
    small_producers_included: int
    large_producers_included: int
    total_small_producers: int
    total_large_producers: int
    explanation: str
    fairness_notes: List[str]
    method: str = "deterministic"  # "deterministic" or "ai"


class WhatIfRequest(BaseModel):
    question: str = Field(..., min_length=5, description="What-if question")


class WhatIfResponse(BaseModel):
    question: str
    analysis: str
    impact_summary: str


# ──────────────────── DASHBOARD ────────────────────

class DashboardData(BaseModel):
    total_harvest: float
    total_demand: float
    total_matched: float
    total_transport_capacity: float
    total_available_transport: float
    active_farmers: int
    active_buyers: int
    active_orders: int
    collection_slots: int
    small_producers: int
    large_producers: int
    quality_distribution: dict
    unallocated: float
    unmet_demand: float
