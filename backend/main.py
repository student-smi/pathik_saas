from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import FRONTEND_URL, PORT
from routers import auth, societies, houses, bills, portal, exports

app = FastAPI(
    title="Pathik Society Water Bill SaaS API (FastAPI)",
    description="Production Ready FastAPI Backend for Water Bill Management System",
    version="1.0.0"
)

# CORS Middleware
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    FRONTEND_URL,
    "https://pathik-saas-frontend.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for seamless Vercel integration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(societies.router)
app.include_router(houses.router)
app.include_router(bills.router)
app.include_router(portal.router)
app.include_router(exports.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Pathik Water Bill SaaS API (Python FastAPI)",
        "docs": "/docs",
        "time": "2026-09-14"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
