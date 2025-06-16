from fastapi import APIRouter, HTTPException, status, Depends
from celery.result import AsyncResult
from api.worker import celery_app
from api.schemas.task import TaskStatus
from api.auth.firebase import get_current_user

router = APIRouter()

@router.get(
    "/{task_id}",
    response_model=TaskStatus,
    summary="Get Task Status and Result",
    dependencies=[Depends(get_current_user)]
)
def get_task_status(task_id: str):
    """
    Retrieve the status and result of a background task.
    Once a task is submitted, use this endpoint with the returned `task_id`
    to poll for its completion.
    """
    task_result = AsyncResult(task_id, app=celery_app)
    
    # Safely serialize the task result.
    # Celery may return exception objects (e.g., ``NotRegistered``) that Pydantic
    # cannot natively serialize. Convert any Exception instance to its string
    # representation to avoid ``PydanticSerializationError``.
    if task_result.ready():
        _raw_result = task_result.result
        result = str(_raw_result) if isinstance(_raw_result, Exception) else _raw_result
    else:
        result = None
    
    if task_result.state == 'FAILURE':
        # If the task failed, the result contains the exception.
        # We should log it and return a clean error message.
        print(f"Task {task_id} failed with error: {result}")
        # In a real app, you might hide the detailed error from the user.
        # For our case, returning it is useful for debugging.
        
    return TaskStatus(task_id=task_id, status=task_result.state, result=result)