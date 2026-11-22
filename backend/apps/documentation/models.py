import uuid
from django.db import models
from projects.models import Project

class GeneratedDocument(models.Model):
    class DocType(models.TextChoices):
        OVERVIEW = 'overview', 'Project Architecture & Overview'
        INSTALLATION = 'installation', 'Installation & Setup Guide'
        API = 'api', 'API & Endpoint Reference'
        MODULES = 'modules', 'Module & Dependency Breakdown'
        ONBOARDING = 'onboarding', 'Developer Onboarding Walkthrough'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='documents')
    doc_type = models.CharField(max_length=30, choices=DocType.choices)
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        unique_together = ('project', 'doc_type')
        indexes = [
            models.Index(fields=['project', 'doc_type']),
        ]

    def __str__(self):
        return f"{self.title} ({self.project.name})"
