import os
import logging
from celery import shared_task
from projects.models import Project
from .models import AnalysisJob
from .services import IngestionService

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def index_repository_task(self, project_id: str, zip_path: str, job_id: str):
    logger.info("Starting index_repository_task for project %s (job %s)", project_id, job_id)
    try:
        project = Project.objects.get(id=project_id)
        job = AnalysisJob.objects.get(id=job_id)
        IngestionService.process_zip_archive(project, zip_path, job)
        if os.path.exists(zip_path):
            os.remove(zip_path)
    except Exception as e:
        logger.exception("Error in index_repository_task: %s", e)
        if os.path.exists(zip_path):
            os.remove(zip_path)
        raise

@shared_task(bind=True)
def download_and_index_github_task(self, project_id: str, github_url: str, job_id: str):
    logger.info("Starting download_and_index_github_task for project %s (%s)", project_id, github_url)
    zip_path = None
    try:
        project = Project.objects.get(id=project_id)
        job = AnalysisJob.objects.get(id=job_id)
        job.stage_message = "Downloading repository from GitHub..."
        job.progress = 5
        job.save(update_fields=['stage_message', 'progress'])

        zip_path = IngestionService.download_github_repository(github_url)
        IngestionService.process_zip_archive(project, zip_path, job)
    except Exception as e:
        logger.exception("Error in download_and_index_github_task: %s", e)
        if job_id:
            try:
                job = AnalysisJob.objects.get(id=job_id)
                job.status = AnalysisJob.Status.FAILED
                job.error_message = str(e)
                job.stage_message = f"Download failed: {str(e)}"
                job.save()
            except Exception:
                pass
        raise
    finally:
        if zip_path and os.path.exists(zip_path):
            os.remove(zip_path)
