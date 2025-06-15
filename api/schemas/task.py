from pydantic import BaseModel, Field
from typing import Any, Optional

class TaskStatus(BaseModel):
    task_id: str
    status: str = Field(..., description="The state of the task (e.g., PENDING, SUCCESS, FAILURE)")
    result: Optional[Any] = Field(None, description="The result of the task if it has completed successfully.")