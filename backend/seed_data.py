"""
HarvestLink AI — Seed Data Script (v2)

Populates the database with realistic demo data for the hackathon.

Usage:
    python seed_data.py           # Only seeds if empty
    python seed_data.py --force   # Wipes and re-seeds
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, async_session
from app.models.models import (
    Farmer, Harvest, Buyer, Order, Vehicle,
    BuyerRequest, TransportRecommendation, TruckAllocation, Notification, Allocation
)


async def seed(force: bool = False):
    """Seed the database with demo data."""
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        from sqlalchemy import select, func, text

        # Check existing data
        count = (await session.execute(select(func.count(Farmer.id)))).scalar()
        if count > 0 and not force:
            print("Database already has data. Skipping seed.")
            return

        if force and count > 0:
            print("Force re-seeding — clearing existing data...")
            for table in reversed(Base.metadata.sorted_tables):
                await session.execute(table.delete())
            await session.commit()
            print("Cleared all data.")

        # ──────────── FARMERS ────────────
        farmers = [
            Farmer(
                name="Farm A — Ravi Kumar", location="Kolar District, Karnataka", farm_size=2.5, producer_type="small",
                pan_card="ABCPK1234F", land_location="Survey No. 42/3, Mulbagal Taluk, Kolar — 13.1647°N, 78.3932°E",
                phone="9876543210", email="ravi.kumar@gmail.com", aadhaar_last4="4521"
            ),
            Farmer(
                name="Farm B — Priya Devi", location="Chikkaballapur, Karnataka", farm_size=1.8, producer_type="small",
                pan_card="BXYPS5678G", land_location="Survey No. 18/1, Gudibande Taluk, Chikkaballapur — 13.6139°N, 77.7066°E",
                phone="9123456789", email="priya.devi@yahoo.com", aadhaar_last4="8734"
            ),
            Farmer(
                name="Farm C — Suresh Reddy", location="Ramanagara, Karnataka", farm_size=8.0, producer_type="large",
                pan_card="CRXPR2345H", land_location="Survey No. 105/A, Magadi Taluk, Ramanagara — 12.9532°N, 77.2278°E",
                phone="9988776655", email="suresh.agro@outlook.com", aadhaar_last4="2109"
            ),
            Farmer(
                name="Farm D — Venkat Rao", location="Tumkur, Karnataka", farm_size=6.5, producer_type="large",
                pan_card="EVXPV9012K", land_location="Survey No. 88/B, Tiptur Taluk, Tumkur — 13.2580°N, 76.4720°E",
                phone="7766554433", email="venkat.rao@farm.in", aadhaar_last4="1098"
            ),
        ]
        session.add_all(farmers)
        await session.flush()

        # ──────────── HARVESTS ────────────
        import datetime
        today = datetime.date.today().isoformat()
        tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

        harvests = [
            Harvest(
                farmer_id=farmers[0].id, crop="Tomato",
                estimated_quantity=1500, sorted_quantity=1400,
                quality_grade="A", harvest_date=today,
                available_date=today, location="Kolar District",
                expected_price=25.0, status="sorted"
            ),
            Harvest(
                farmer_id=farmers[1].id, crop="Tomato",
                estimated_quantity=800, sorted_quantity=750,
                quality_grade="A", harvest_date=today,
                available_date=today, location="Chikkaballapur",
                expected_price=22.0, status="sorted"
            ),
            Harvest(
                farmer_id=farmers[2].id, crop="Tomato",
                estimated_quantity=1200, sorted_quantity=1100,
                quality_grade="B", harvest_date=today,
                available_date=tomorrow, location="Ramanagara",
                expected_price=18.0, status="sorted"
            ),
            Harvest(
                farmer_id=farmers[3].id, crop="Tomato",
                estimated_quantity=900, sorted_quantity=None,
                quality_grade="A", harvest_date=tomorrow,
                available_date=tomorrow, location="Tumkur",
                expected_price=24.0, status="estimated"
            ),
        ]
        session.add_all(harvests)

        # ──────────── BUYERS ────────────
        buyers = [
            Buyer(
                name="ABC Restaurant Group", location="Bangalore City",
                contact="abc.restaurant@email.com",
                phone="9445566778", aadhaar_last4="4521"
            ),
            Buyer(
                name="FreshMart Supermarket", location="Mysore",
                contact="freshmart@email.com",
                phone="9334455667", aadhaar_last4="7890"
            ),
        ]
        session.add_all(buyers)
        await session.flush()

        # ──────────── VEHICLES (Trucks) ────────────
        vehicles = [
            Vehicle(
                vehicle_number="T1 — KA-01-AB-1234",
                capacity=800, available_capacity=800,
                availability_date=today, status="available",
                cost_per_trip=1600,
                driver_name="Ramesh S.",
                driver_contact="9988112233",
                current_location="Kolar Highway"
            ),
            Vehicle(
                vehicle_number="T2 — KA-02-CD-5678",
                capacity=500, available_capacity=500,
                availability_date=today, status="available",
                cost_per_trip=1100,
                driver_name="Kumar V.",
                driver_contact="9977223344",
                current_location="Chikkaballapur Road"
            ),
            Vehicle(
                vehicle_number="T3 — KA-03-EF-9012",
                capacity=200, available_capacity=200,
                availability_date=today, status="available",
                cost_per_trip=500,
                driver_name="Suresh M.",
                driver_contact="9966334455",
                current_location="Ramanagara Depot"
            ),
            Vehicle(
                vehicle_number="T4 — KA-04-GH-3456",
                capacity=100, available_capacity=100,
                availability_date=today, status="available",
                cost_per_trip=300,
                driver_name="Venkat R.",
                driver_contact="9955445566",
                current_location="Tumkur Yard"
            ),
        ]
        session.add_all(vehicles)

        await session.commit()
        print("\n✅ Demo data seeded successfully!")
        print(f"   {len(farmers)} farmers (Farm A, B, C, D)")
        print(f"   {len(harvests)} harvests")
        print(f"   {len(buyers)} buyers (ABC Restaurant, FreshMart)")
        print(f"   {len(vehicles)} trucks (T1=800kg, T2=500kg, T3=200kg, T4=100kg)")
        print("\nDemo Credentials:")
        print("   Farmer login   → farmer1 / 1234")
        print("   Buyer login    → buyer1 / 1234")
        print("   Transporter    → transporter1 / 1234")
        print("\n🌐 Open http://localhost:5173 to access the app")


if __name__ == "__main__":
    force = "--force" in sys.argv
    asyncio.run(seed(force=force))
