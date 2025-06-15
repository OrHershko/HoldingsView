from api.worker import celery_app
from api.services import market_data_aggregator

@celery_app.task(name="tasks.get_enriched_market_data_task")
def get_enriched_market_data_task(symbol: str):
    """
    Celery task to fetch enriched market data.
    
    This wraps our existing synchronous service function, allowing it to be
    executed by a Celery worker in the background.
    """
    # Note: We are using an `async def` function inside a sync task.
    # Celery 5+ supports this with `celery.result.AsyncResult.get()`.
    # For simplicity and clarity in a sync worker, we'll call the aggregator's
    # core synchronous logic directly if we were to refactor it.
    # However, Celery can manage running async functions. Let's keep the aggregator as is.
    
    # To run an async function from a sync Celery task, we need an event loop.
    import asyncio
    
    try:
        data = asyncio.run(market_data_aggregator.get_enriched_market_data(symbol))
        # Celery needs to return JSON-serializable data. Pydantic models are, but
        # it's good practice to convert to a dict.
        return data.model_dump(mode="json")
    except Exception as e:
        # It's good practice to handle exceptions within the task
        # and return a serializable error message.
        return {"error": str(e), "symbol": symbol}