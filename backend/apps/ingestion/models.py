import uuid
from django.db import models
from projects.models import Project

class AnalysisJob(models.Model):
    class JobType(models.TextChoices):
        INDEXING = 'indexing', 'Repository Indexing'
        REINDEXING = 'reindexing', 'Repository Re-indexing'
        SECURITY_SCAN = 'security_scan', 'Security Scan'
        DOCUMENTATION = 'documentation', 'Documentation Generation'
        IMPACT_ANALYSIS = 'impact_analysis', 'Change Impact Analysis'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RUNNING = 'running', 'Running'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='jobs')
    job_type = models.CharField(max_length=30, choices=JobType.choices, default=JobType.INDEXING)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    progress = models.IntegerField(default=0) # 0 to 100
    stage_message = models.CharField(max_length=255, default='Job queued')
    error_message = models.TextField(blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['job_type', 'status']),
        ]

    def __str__(self):
        return f"{self.job_type} ({self.status}) - {self.project.name} [{self.progress}%]"
