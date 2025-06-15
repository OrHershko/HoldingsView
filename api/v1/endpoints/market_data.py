from fastapi import APIRouter, status, Depends
from api.auth.firebase import get_current_user
from api.tasks import get_enriched_market_data_task
from api.schemas.task import TaskStatus

router = APIRouter()

@router.post(
    "/{symbol}",
    response_model=TaskStatus,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Enriched Market Data Analysis",
    dependencies=[Depends(get_current_user)]
)
def trigger_market_data_for_symbol(symbol: str):
    """
    Submits a background task to fetch and analyze market data for a symbol.
    
    This endpoint returns immediately with a `task_id`. Use the
    `/api/v1/tasks/{task_id}` endpoint to check the status and retrieve the
    result once the task is complete.
    """
    # .delay() is the shortcut to send a task to the queue
    task = get_enriched_market_data_task.delay(symbol.upper())
    return TaskStatus(task_id=task.id, status="PENDING")