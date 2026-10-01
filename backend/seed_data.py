"""
HarvestLink AI — Database Seeding Script
Seeds exactly 5 farmer accounts, buyer, transporter, and admin accounts with bcrypt-hashed passwords.
Ensures single source of truth and prevents duplicate accounts on application restart.
"""
import asyncio
import sys
import os
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, async_session
from app.models.models import (
    User, Farmer, Harvest, Buyer, Order, Vehicle,
    BuyerRequest, TransportRecommendation, TruckAllocation, Notification, Allocation
)
from app.services.auth import hash_password


async def seed(force: bool = False):
    """Seed the database with exact hackathon accounts and demo records."""
    if force:
        print("Force mode enabled: dropping existing tables for schema refresh...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
    else:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        from sqlalchemy import select, func

        # Check existing user accounts
        user_count = (await session.execute(select(func.count(User.id)))).scalar()
        if user_count > 0 and not force:
            print(f"Database already seeded with {user_count} users. Skipping to prevent duplicates.")
            return

        hashed_pw = hash_password("1234")
        now_str = datetime.datetime.now().isoformat(timespec="seconds")
        today = datetime.date.today().isoformat()
        tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

        # ──────────── 1. EXACTLY 5 FARMERS ────────────
        farmers_data = [
            {
                "username": "farmer1",
                "name": "Ramesh Gowda",
                "farm_name": "Green Valley Farm",
                "location": "Kolar, Karnataka",
                "farm_size": 4.5,
                "producer_type": "small",
                "crop": "Tomato",
                "pan_card": "ABCDE1234F",
                "land_location": "Survey No. 42/3, Mulbagal Taluk, Kolar — 13.1647°N, 78.3932°E",
                "phone": "9876543211",
                "email": "farmer1@greenvalley.in",
                "aadhaar_last4": "4521",
            },
            {
                "username": "farmer2",
                "name": "Suresh Patel",
                "farm_name": "Sunrise Farm",
                "location": "Chikkaballapur, Karnataka",
                "farm_size": 3.2,
                "producer_type": "small",
                "crop": "Tomato",
                "pan_card": "BCDEF2345G",
                "land_location": "Survey No. 18/1, Gudibande Taluk, Chikkaballapur — 13.6139°N, 77.7066°E",
                "phone": "9876543212",
                "email": "farmer2@sunrisefarm.in",
                "aadhaar_last4": "8734",
            },
            {
                "username": "farmer3",
                "name": "Anand Kumar",
                "farm_name": "Golden Fields Farm",
                "location": "Mandya, Karnataka",
                "farm_size": 8.0,
                "producer_type": "large",
                "crop": "Tomato",
                "pan_card": "CDEFG3456H",
                "land_location": "Survey No. 105/A, Maddur Taluk, Mandya — 12.5218°N, 76.8951°E",
                "phone": "9876543213",
                "email": "farmer3@goldenfields.in",
                "aadhaar_last4": "2109",
            },
            {
                "username": "farmer4",
                "name": "Rajesh Patil",
                "farm_name": "Hilltop Organics",
                "location": "Belagavi, Karnataka",
                "farm_size": 5.5,
                "producer_type": "large",
                "crop": "Tomato",
                "pan_card": "DEFGH4567J",
                "land_location": "Survey No. 77/C, Gokak Taluk, Belagavi — 15.8497°N, 74.4977°E",
                "phone": "9876543214",
                "email": "farmer4@hilltop.in",
                "aadhaar_last4": "6543",
            },
            {
                "username": "farmer5",
                "name": "Manjunath Hegde",
                "farm_name": "Bhoomi Krishi Farm",
                "location": "Davanagere, Karnataka",
                "farm_size": 2.8,
                "producer_type": "small",
                "crop": "Tomato",
                "pan_card": "EFGHI5678K",
                "land_location": "Survey No. 12/2, Harihar Taluk, Davanagere — 14.4644°N, 75.9218°E",
                "phone": "9876543215",
                "email": "farmer5@bhoomikrishi.in",
                "aadhaar_last4": "3210",
            },
        ]

        created_farmers = []
        for fdata in farmers_data:
            farmer = Farmer(
                username=fdata["username"],
                name=fdata["name"],
                farm_name=fdata["farm_name"],
                location=fdata["location"],
                farm_size=fdata["farm_size"],
                producer_type=fdata["producer_type"],
                crop=fdata["crop"],
                pan_card=fdata["pan_card"],
                land_location=fdata["land_location"],
                phone=fdata["phone"],
                email=fdata["email"],
                aadhaar_last4=fdata["aadhaar_last4"],
            )
            session.add(farmer)
            await session.flush()
            created_farmers.append(farmer)

            user = User(
                username=fdata["username"],
                password_hash=hashed_pw,
                role="farmer",
                farmer_id=farmer.id,
                full_name=fdata["name"],
                created_at=now_str,
            )
            session.add(user)

        # ──────────── 2. BUYER (buyer1) ────────────
        buyer = Buyer(
            username="buyer1",
            name="ABC Restaurant",
            location="Bangalore, Karnataka",
            contact="procurement@abcrestaurant.com",
            phone="9445566778",
            aadhaar_last4="7890",
        )
        session.add(buyer)
        await session.flush()

        buyer_user = User(
            username="buyer1",
            password_hash=hashed_pw,
            role="buyer",
            buyer_id=buyer.id,
            full_name="ABC Restaurant Procurement",
            created_at=now_str,
        )
        session.add(buyer_user)

        # ──────────── 3. TRANSPORTER (transporter1) & TRUCKS ────────────
        transporter_user = User(
            username="transporter1",
            password_hash=hashed_pw,
            role="transporter",
            full_name="Raj Transport Services",
            created_at=now_str,
        )
        session.add(transporter_user)
        await session.flush()

        trucks = [
            Vehicle(
                vehicle_number="T1 — KA-01-AB-1234",
                capacity=800, available_capacity=800,
                availability_date=today, status="available",
                cost_per_trip=1600,
                driver_name="Ramesh S.",
                driver_contact="9988112233",
                transporter_name="Raj Transport Services",
                username="transporter1",
                current_location="Kolar Highway",
            ),
            Vehicle(
                vehicle_number="T2 — KA-02-CD-5678",
                capacity=500, available_capacity=500,
                availability_date=today, status="available",
                cost_per_trip=1100,
                driver_name="Kumar V.",
                driver_contact="9977223344",
                transporter_name="Raj Transport Services",
                username="transporter1",
                current_location="Chikkaballapur Road",
            ),
            Vehicle(
                vehicle_number="T3 — KA-03-EF-9012",
                capacity=200, available_capacity=200,
                availability_date=today, status="available",
                cost_per_trip=500,
                driver_name="Suresh M.",
                driver_contact="9966334455",
                transporter_name="Raj Transport Services",
                username="transporter1",
                current_location="Ramanagara Depot",
            ),
            Vehicle(
                vehicle_number="T4 — KA-04-GH-3456",
                capacity=100, available_capacity=100,
                availability_date=today, status="available",
                cost_per_trip=300,
                driver_name="Venkat R.",
                driver_contact="9955445566",
                transporter_name="Raj Transport Services",
                username="transporter1",
                current_location="Tumkur Yard",
            ),
        ]
        session.add_all(trucks)

        # ──────────── 4. ADMIN (admin) ────────────
        admin_user = User(
            username="admin",
            password_hash=hashed_pw,
            role="admin",
            full_name="System Administrator",
            created_at=now_str,
        )
        session.add(admin_user)

        # ──────────── 5. ZERO TRANSACTIONAL DATA (CLEAN SLATE) ────────────
        # All harvests, orders, buyer requests, and allocations start at ZERO
        await session.commit()
        print("\n[SUCCESS] Seed complete! All accounts ready with password '1234':")
        print("   Farmers:      farmer1, farmer2, farmer3, farmer4, farmer5")
        print("   Buyer:        buyer1")
        print("   Transporter:  transporter1")
        print("   Admin:        admin")
        print("   Trucks:       T1 (800kg), T2 (500kg), T3 (200kg), T4 (100kg)")


if __name__ == "__main__":
    force = "--force" in sys.argv
    asyncio.run(seed(force=force))
