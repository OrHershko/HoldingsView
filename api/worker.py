from celery import Celery
from celery.schedules import crontab
from api.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["api.tasks"]
)

# --- Add Celery Beat Schedule ---
@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Schedule the snapshot task to run every day at 1 AM UTC
    # (after most markets have closed)
    sender.add_periodic_task(
        crontab(hour=1, minute=0),
        'tasks.create_snapshots_for_all_portfolios',
        name='Create daily portfolio snapshots',
    )

celery_app.conf.update(
    task_track_started=True,
)