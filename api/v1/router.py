from fastapi import APIRouter

from api.v1.endpoints import users, portfolios, market_data, tasks, watchlist

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(portfolios.router, prefix="/portfolios", tags=["Portfolios"])
api_router.include_router(
    market_data.router, prefix="/market-data", tags=["Market Data"]
)
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(watchlist.router, prefix="/watchlist", tags=["Watchlist"])
