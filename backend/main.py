import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.session import engine, Base
from app.api import auth_routes, student_routes, recruiter_routes, admin_routes
from app.core.config import FRONTEND_URL
from seed_data import seed_database

# Create DB tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        seed_database()
    except Exception as e:
        print(f"Startup seed notice: {e}")
    yield

app = FastAPI(
    title="VFSTR AutoPlace AI - Placement Management Agent",
    description="Agentic Campus Recruitment & Placement Platform for Vignan's Foundation for Science, Technology and Research",
    version="2.0.0",
    lifespan=lifespan
)

# Robust CORS Configuration for Production Deployment
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]

if FRONTEND_URL and FRONTEND_URL != "*":
    for u in FRONTEND_URL.split(","):
        clean_u = u.strip().rstrip("/")
        if clean_u and clean_u not in origins:
            origins.append(clean_u)

use_wildcard = (FRONTEND_URL == "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if use_wildcard else origins,
    allow_origin_regex=None if use_wildcard else r"https://.*\.onrender\.com",
    allow_credentials=False if use_wildcard else True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_routes.router)
app.include_router(student_routes.router)
app.include_router(recruiter_routes.router)
app.include_router(admin_routes.router)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "system": "VFSTR AutoPlace AI Agent",
        "version": "2.0.0",
        "docs_url": "/docs"
    }

@app.get("/health")
def liveness_check():
    return {"status": "healthy"}
