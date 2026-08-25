import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import routers.evaluate as evaluate
import routers.auth as auth
import routers.exams as exams
import routers.mapping as mapping
from core.db import database

# ── Configure logging ─────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s \u2014 %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Allowed origins ───────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app = FastAPI(
    title="GradeAI Backend API",
    description="Intelligent Answer Sheet Evaluator API",
    version="1.0.0",
)

# CORS \u2014 must use explicit origins when allow_credentials=True
# (browsers reject wildcard "*" combined with credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler \u2014 always returns CORS headers ────
# Without this, an unhandled 500 inside a route handler returns
# a response with no CORS headers and the browser blocks it.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Vary"] = "Origin"

    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=headers,
    )


# ── Startup: only lightweight DB connection ───────────────────
@app.on_event("startup")
async def startup_db_client():
    database.connect_db()
    logger.info("Server started \u2014 heavy models will load lazily on first request.")

@app.on_event("shutdown")
async def shutdown_db_client():
    database.close_db()

app.include_router(auth.router)
app.include_router(exams.router)
app.include_router(evaluate.router, tags=["evaluation"])
app.include_router(mapping.router, tags=["assessment-mapping"])

@app.get("/health-check")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=7860, reload=True)
