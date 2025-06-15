from celery import Celery
from api.core.config import settings

# Initialize the Celery app
# The first argument is the name of the current module.
# The `broker` and `backend` are set from our config file.
celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["api.tasks"]  # Explicitly include the tasks module
)

# Optional configuration
celery_app.conf.update(
    task_track_started=True,
)