"""
HarvestLink AI — SQLAlchemy Models
"""
from sqlalchemy import Column, Integer, String, Float, Date, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    location = Column(String(200), nullable=False)
    farm_size = Column(Float, nullable=False)  # in hectares
    producer_type = Column(String(10), nullable=False)  # "small" or "large"
    pan_card = Column(String(10), nullable=True)  # PAN card number (e.g. ABCDE1234F)
    land_location = Column(String(300), nullable=True)  # Detailed land address / GPS coordinates
    phone = Column(String(15), nullable=True)  # Contact phone
    email = Column(String(100), nullable=True)  # Contact email
    aadhaar_last4 = Column(String(4), nullable=True)  # Last 4 digits of Aadhaar for verification

    harvests = relationship("Harvest", back_populates="farmer", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Farmer {self.name} ({self.producer_type})>"


class Harvest(Base):
    __tablename__ = "harvests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    crop = Column(String(50), default="Tomato")
    estimated_quantity = Column(Float, nullable=False)  # kg
    sorted_quantity = Column(Float, nullable=True)  # kg, updated after sorting
    quality_grade = Column(String(1), nullable=False)  # A, B, or C
    harvest_date = Column(String(20), nullable=False)  # ISO date string
    status = Column(String(20), default="estimated")  # estimated, sorted, allocated, collected

    farmer = relationship("Farmer", back_populates="harvests")
    allocations = relationship("Allocation", back_populates="harvest", cascade="all, delete-orphan")

    @property
    def available_quantity(self):
        """Returns sorted quantity if available, otherwise estimated."""
        return self.sorted_quantity if self.sorted_quantity is not None else self.estimated_quantity

    def __repr__(self):
        return f"<Harvest {self.crop} {self.available_quantity}kg Grade {self.quality_grade}>"


class Buyer(Base):
    __tablename__ = "buyers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    location = Column(String(200), nullable=False)
    contact = Column(String(100), nullable=True)

    orders = relationship("Order", back_populates="buyer", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Buyer {self.name}>"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=False)
    quantity = Column(Float, nullable=False)  # kg
    quality_grade = Column(String(1), nullable=False)  # A, B, or C
    delivery_date = Column(String(20), nullable=False)  # ISO date string
    recurring = Column(Boolean, default=False)
    frequency = Column(String(20), default="none")  # daily, weekly, none
    status = Column(String(20), default="active")  # active, fulfilled, cancelled

    buyer = relationship("Buyer", back_populates="orders")
    allocations = relationship("Allocation", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order {self.quantity}kg Grade {self.quality_grade}>"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vehicle_number = Column(String(50), nullable=False)
    capacity = Column(Float, nullable=False)  # kg
    available_capacity = Column(Float, nullable=False)  # kg
    availability_date = Column(String(20), nullable=False)  # ISO date string
    status = Column(String(20), default="available")  # available, in_use, maintenance

    allocations = relationship("Allocation", back_populates="vehicle", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Vehicle {self.vehicle_number} {self.available_capacity}/{self.capacity}kg>"


class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    harvest_id = Column(Integer, ForeignKey("harvests.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    quantity = Column(Float, nullable=False)  # kg allocated
    collection_slot = Column(String(50), nullable=True)  # e.g. "Morning Slot 1"
    status = Column(String(20), default="planned")  # planned, collected, delivered

    harvest = relationship("Harvest", back_populates="allocations")
    order = relationship("Order", back_populates="allocations")
    vehicle = relationship("Vehicle", back_populates="allocations")

    def __repr__(self):
        return f"<Allocation {self.quantity}kg>"
