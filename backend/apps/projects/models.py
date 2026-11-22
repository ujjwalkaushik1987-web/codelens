import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Project(models.Model):
    class SourceType(models.TextChoices):
        ZIP = 'zip', 'ZIP Codebase Upload'
        GITHUB = 'github', 'GitHub Repository'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending Indexing'
        INDEXING = 'indexing', 'Indexing Codebase'
        READY = 'ready', 'Ready'
        FAILED = 'failed', 'Indexing Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    source_type = models.CharField(max_length=20, choices=SourceType.choices, default=SourceType.ZIP)
    repository_url = models.URLField(max_length=500, blank=True, default='')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Statistical summaries
    file_count = models.IntegerField(default=0)
    symbol_count = models.IntegerField(default=0)
    chunk_count = models.IntegerField(default=0)
    line_count = models.IntegerField(default=0)
    languages = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    last_indexed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.name} ({self.owner.email})"
