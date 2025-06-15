from fastapi import APIRouter

from api.v1.endpoints import users, portfolios

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(portfolios.router, prefix="/portfolios", tags=["Portfolios"])