import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, clean, export

app = FastAPI(
    title="Purixa API",
    description="Data Cleaning Web Application Backend",
    version="1.0.0",
)

# CORS: read from env var in production, fallback to localhost for dev
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
_extra_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
] + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(clean.router, prefix="/api", tags=["clean"])
app.include_router(export.router, prefix="/api", tags=["export"])


@app.get("/")
async def root():
    return {"message": "Purixa API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}
