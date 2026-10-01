"""
HarvestLink AI — FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base, init_db
from app.routes import farmers, buyers, vehicles, ai, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


app = FastAPI(
    title="HarvestLink AI",
    description="AI-powered coordination platform for perishable tomato supply chains",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(farmers.router, prefix="/api", tags=["Farmers & Harvests"])
app.include_router(buyers.router, prefix="/api", tags=["Buyers & Orders"])
app.include_router(vehicles.router, prefix="/api", tags=["Vehicles"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Coordination"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "HarvestLink AI",
        "tagline": "Turning scattered harvests into coordinated deliveries.",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
