import uuid
from django.db import models
from django.conf import settings
from projects.models import Project
from repositories.models import RepositoryFile

if getattr(settings, 'USE_PGVECTOR', False):
    try:
        from pgvector.django import VectorField
        VectorFieldType = lambda: VectorField(dimensions=getattr(settings, 'EMBEDDING_DIMENSION', 384), null=True, blank=True)
    except ImportError:
        VectorFieldType = lambda: models.JSONField(default=list, blank=True)
else:
    VectorFieldType = lambda: models.JSONField(default=list, blank=True)

class CodeChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='chunks')
    file = models.ForeignKey(RepositoryFile, on_delete=models.CASCADE, related_name='chunks')
    chunk_index = models.IntegerField(default=0)
    symbol_name = models.CharField(max_length=255, blank=True, default='')
    content = models.TextField()
    start_line = models.IntegerField()
    end_line = models.IntegerField()
    embedding = VectorFieldType()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['file', 'start_line']
        indexes = [
            models.Index(fields=['project', 'file']),
            models.Index(fields=['project', 'symbol_name']),
        ]

    def __str__(self):
        return f"{self.file.path} [{self.start_line}-{self.end_line}] ({self.symbol_name or 'block'})"
