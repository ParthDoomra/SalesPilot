import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import projects, agents
from app.config import settings

# Initialize FastAPI App
app = FastAPI(
    title="SalesPilot AI Backend",
    description="Enterprise Presales Solution Architect & AI Pricing Orchestrator",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in strict production build if necessary
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure local exports folder exists and mount it for local downloads fallback
exports_dir = os.path.join(os.path.dirname(__file__), "static", "exports")
os.makedirs(exports_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")), name="static")

# Include API Router endpoints
app.include_router(projects.router, prefix="/api")
app.include_router(agents.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "SalesPilot AI Orchestrator API Gateway",
        "demoMode": settings.DEMO_MODE,
        "firebaseConfigured": settings.is_firebase_configured,
        "anthropicConfigured": settings.is_claude_configured
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
