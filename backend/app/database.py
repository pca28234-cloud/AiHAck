"""
HarvestLink AI — Database Configuration (SQLite with async SQLAlchemy)
Designed so switching to PostgreSQL later only requires changing the URL.
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

DATABASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "database")
os.makedirs(DATABASE_DIR, exist_ok=True)

DATABASE_URL = f"sqlite+aiosqlite:///{os.path.join(DATABASE_DIR, 'harvestlink.db')}"


engine = create_async_engine(DATABASE_URL, echo=False)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency: yields an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables on startup."""
    async with engine.begin() as conn:
        from app.models.models import (  # noqa
            Farmer, Harvest, Buyer, Order, BuyerRequest,
            Vehicle, Allocation, TransportRecommendation,
            TruckAllocation, Notification
        )
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialized successfully")

