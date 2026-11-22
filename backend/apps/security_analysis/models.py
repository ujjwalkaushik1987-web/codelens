import uuid
from django.db import models
from projects.models import Project
from repositories.models import RepositoryFile

class SecurityFinding(models.Model):
    class Severity(models.TextChoices):
        CRITICAL = 'critical', 'Critical'
        HIGH = 'high', 'High'
        MEDIUM = 'medium', 'Medium'
        LOW = 'low', 'Low'
        INFO = 'info', 'Informational'

    class Category(models.TextChoices):
        SECRET = 'secret', 'Hardcoded Secret'
        SQLI = 'sqli', 'SQL Injection Risk'
        AUTH = 'auth', 'Insecure Authentication'
        PERMISSIONS = 'permissions', 'Unsafe Permissions / Config'
        DEPENDENCIES = 'dependencies', 'Dangerous Dependency / Function'
        VALIDATION = 'validation', 'Missing Input Validation'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='security_findings')
    file = models.ForeignKey(RepositoryFile, on_delete=models.CASCADE, related_name='security_findings')
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    category = models.CharField(max_length=30, choices=Category.choices, default=Category.SECRET)
    title = models.CharField(max_length=255)
    description = models.TextField()
    start_line = models.IntegerField(default=1)
    end_line = models.IntegerField(default=1)
    code_snippet = models.TextField(blank=True, default='')
    recommendation = models.TextField(blank=True, default='')
    confidence = models.CharField(max_length=20, default='high')
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-severity', 'file', 'start_line']
        indexes = [
            models.Index(fields=['project', 'severity']),
            models.Index(fields=['project', 'category']),
        ]

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title} in {self.file.path}:{self.start_line}"
