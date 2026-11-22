import uuid
from django.db import models
from projects.models import Project

class RepositoryFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='files')
    path = models.CharField(max_length=1000, db_index=True)
    language = models.CharField(max_length=50, default='text')
    size = models.BigIntegerField(default=0)
    content_hash = models.CharField(max_length=64, blank=True)
    line_count = models.IntegerField(default=0)
    content = models.TextField(blank=True)
    is_binary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['path']
        unique_together = ('project', 'path')
        indexes = [
            models.Index(fields=['project', 'language']),
            models.Index(fields=['project', 'path']),
        ]

    def __str__(self):
        return f"{self.project.name}:{self.path}"

class CodeSymbol(models.Model):
    class SymbolType(models.TextChoices):
        FUNCTION = 'function', 'Function'
        CLASS = 'class', 'Class'
        METHOD = 'method', 'Method'
        IMPORT = 'import', 'Import'
        ROUTE = 'route', 'Route / API Endpoint'
        MODEL = 'model', 'Data Model / Schema'
        SERVICE = 'service', 'Service'
        VARIABLE = 'variable', 'Variable / Constant'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='symbols')
    file = models.ForeignKey(RepositoryFile, on_delete=models.CASCADE, related_name='symbols')
    symbol_type = models.CharField(max_length=30, choices=SymbolType.choices)
    name = models.CharField(max_length=255, db_index=True)
    start_line = models.IntegerField()
    end_line = models.IntegerField()
    signature = models.TextField(blank=True, default='')
    docstring = models.TextField(blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['file', 'start_line']
        indexes = [
            models.Index(fields=['project', 'symbol_type']),
            models.Index(fields=['project', 'name']),
        ]

    def __str__(self):
        return f"{self.symbol_type}:{self.name} ({self.file.path}:{self.start_line})"

class CodeRelationship(models.Model):
    class RelationType(models.TextChoices):
        CALLS = 'calls', 'Calls'
        IMPORTS = 'imports', 'Imports'
        INHERITS = 'inherits', 'Inherits'
        REFERENCES = 'references', 'References'
        DEFINES = 'defines', 'Defines'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='relationships')
    source_symbol = models.ForeignKey(CodeSymbol, on_delete=models.CASCADE, related_name='outgoing_relations')
    target_symbol = models.ForeignKey(CodeSymbol, on_delete=models.CASCADE, null=True, blank=True, related_name='incoming_relations')
    target_name = models.CharField(max_length=255, db_index=True)
    relationship_type = models.CharField(max_length=30, choices=RelationType.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['project', 'relationship_type']),
            models.Index(fields=['source_symbol', 'relationship_type']),
        ]

    def __str__(self):
        return f"{self.source_symbol.name} -> [{self.relationship_type}] -> {self.target_name}"
