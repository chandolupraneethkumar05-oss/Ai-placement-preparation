import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.database.session import engine, Base
from app.api import auth_routes, student_routes, recruiter_routes, admin_routes
from app.core.config import FRONTEND_URL
from seed_data import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        seed_database()
    except Exception as e:
        print(f"Startup DB initialization notice: {e}")
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

@app.get("/health")
def liveness_check():
    return {"status": "healthy"}

# =========================================================================
# UNIFIED FULL-STACK DEPLOYMENT (Single URL & Single Service)
# Serves React Frontend SPA directly from FastAPI on root (/) and all paths.
# Ensures all API calls (/auth/..., /student/...) run on the SAME host:
# ZERO CORS issues, ZERO cross-origin network latency, ZERO "Failed to fetch"!
# =========================================================================
possible_dist_paths = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend", "dist")),
    os.path.abspath(os.path.join(os.getcwd(), "frontend", "dist")),
    os.path.abspath("frontend/dist")
]

FRONTEND_DIST = None
for p in possible_dist_paths:
    if os.path.isdir(p) and os.path.isfile(os.path.join(p, "index.html")):
        FRONTEND_DIST = p
        break

if FRONTEND_DIST:
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow native FastAPI routes and documentation
        clean_p = full_path.strip().lower()
        if clean_p.startswith(("docs", "redoc", "openapi.json", "auth", "student", "recruiter", "admin", "health")):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="File not found")
else:
    @app.get("/")
    def health_check():
        return {
            "status": "online",
            "system": "VFSTR AutoPlace AI Agent",
            "version": "2.0.0",
            "docs_url": "/docs"
        }
