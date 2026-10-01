"""
HarvestLink AI — Seed Data Script

Populates the database with realistic demo data for the hackathon demonstration.

Usage:
    python seed_data.py
"""
import asyncio
import sys
import os

# Add parent dir to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, async_session
from app.models.models import Farmer, Harvest, Buyer, Order, Vehicle


async def seed():
    """Seed the database with demo data."""
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Check if data already exists
        from sqlalchemy import select, func
        count = await session.execute(select(func.count(Farmer.id)))
        if count.scalar() > 0:
            print("Database already has data. Skipping seed.")
            return

        # ──────────── FARMERS ────────────
        farmers = [
            Farmer(name="Ravi Kumar", location="Kolar District", farm_size=2.5, producer_type="small"),
            Farmer(name="Priya Devi", location="Chikkaballapur", farm_size=1.8, producer_type="small"),
            Farmer(name="Suresh Reddy", location="Ramanagara", farm_size=8.0, producer_type="large"),
            Farmer(name="Lakshmi Bai", location="Kolar District", farm_size=1.2, producer_type="small"),
            Farmer(name="Venkat Rao", location="Tumkur", farm_size=6.5, producer_type="large"),
        ]
        session.add_all(farmers)
        await session.flush()

        # ──────────── HARVESTS ────────────
        harvests = [
            Harvest(
                farmer_id=farmers[0].id, crop="Tomato",
                estimated_quantity=500, sorted_quantity=420,
                quality_grade="A", harvest_date="2026-10-02", status="sorted"
            ),
            Harvest(
                farmer_id=farmers[1].id, crop="Tomato",
                estimated_quantity=350, sorted_quantity=300,
                quality_grade="A", harvest_date="2026-10-02", status="sorted"
            ),
            Harvest(
                farmer_id=farmers[2].id, crop="Tomato",
                estimated_quantity=250, sorted_quantity=220,
                quality_grade="B", harvest_date="2026-10-02", status="sorted"
            ),
            Harvest(
                farmer_id=farmers[3].id, crop="Tomato",
                estimated_quantity=180, sorted_quantity=150,
                quality_grade="A", harvest_date="2026-10-02", status="sorted"
            ),
            Harvest(
                farmer_id=farmers[4].id, crop="Tomato",
                estimated_quantity=600, sorted_quantity=None,
                quality_grade="A", harvest_date="2026-10-03", status="estimated"
            ),
        ]
        session.add_all(harvests)

        # ──────────── BUYERS ────────────
        buyers = [
            Buyer(name="Fresh Bites Restaurant Group", location="Bangalore City", contact="freshbites@email.com"),
            Buyer(name="Green Valley Market", location="Mysore", contact="greenvalley@email.com"),
        ]
        session.add_all(buyers)
        await session.flush()

        # ──────────── ORDERS ────────────
        orders = [
            Order(
                buyer_id=buyers[0].id, quantity=500,
                quality_grade="A", delivery_date="2026-10-02",
                recurring=True, frequency="daily", status="active"
            ),
            Order(
                buyer_id=buyers[1].id, quantity=200,
                quality_grade="B", delivery_date="2026-10-02",
                recurring=False, frequency="none", status="active"
            ),
        ]
        session.add_all(orders)

        # ──────────── VEHICLES ────────────
        vehicles = [
            Vehicle(
                vehicle_number="KA-01-AB-1234",
                capacity=700, available_capacity=700,
                availability_date="2026-10-02", status="available"
            ),
        ]
        session.add_all(vehicles)

        await session.commit()
        print("Demo data seeded successfully!")
        print(f"   {len(farmers)} farmers")
        print(f"   {len(harvests)} harvests")
        print(f"   {len(buyers)} buyers")
        print(f"   {len(orders)} orders")
        print(f"   {len(vehicles)} vehicles")


if __name__ == "__main__":
    asyncio.run(seed())
