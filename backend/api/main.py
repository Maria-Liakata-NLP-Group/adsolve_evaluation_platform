import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import config, documents, runs

app = FastAPI(title="AdSoLve Evaluation API")

# Parse allowed origins from environment variable; skip empty strings.
_origins = [o for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o]
if _origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

app.include_router(config.router)
app.include_router(runs.router)
app.include_router(documents.router)
