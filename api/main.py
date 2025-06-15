from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from api.core.config import settings
from api.v1.router import api_router

# --- Auth Override Imports ---
from api.auth.firebase import get_current_user
from api.auth.dev_auth import get_dev_user

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# --- Conditional Dependency Override for Development ---
# If the dev flag is enabled, replace the real `get_current_user` with the dummy one.
# This allows testing protected endpoints via Swagger UI without a real token.
if settings.ENVIRONMENT == "development" and settings.DISABLE_AUTH_FOR_DEV:
    print("!!! WARNING: Authentication is disabled for development. !!!")
    app.dependency_overrides[get_current_user] = get_dev_user


if settings.BACKEND_CORS_ORIGINS:
    origins = [str(origin).strip() for origin in settings.BACKEND_CORS_ORIGINS.split(" ")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health Check"])
def read_root():
    """
    A simple health check endpoint.
    """
    return {"status": "ok"}