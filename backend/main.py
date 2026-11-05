from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.session import engine, Base
from app.api import auth_routes, student_routes, recruiter_routes, admin_routes
from seed_data import seed_database

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="VFSTR AutoPlace AI - Placement Management Agent",
    description="Agentic Campus Recruitment & Placement Platform for Vignan's Foundation for Science, Technology and Research",
    version="2.0.0"
)

# Enable CORS for React frontend (Vite default port 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_routes.router)
app.include_router(student_routes.router)
app.include_router(recruiter_routes.router)
app.include_router(admin_routes.router)

@app.on_event("startup")
def on_startup():
    try:
        seed_database()
    except Exception as e:
        print(f"Startup seed notice: {e}")

@app.get("/")
def health_check():
    return {
        "status": "online",
        "system": "VFSTR AutoPlace AI Agent",
        "version": "2.0.0",
        "docs_url": "/docs"
    }
