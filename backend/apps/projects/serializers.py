from rest_framework import serializers
from .models import Project
from ingestion.models import AnalysisJob

class ProjectSerializer(serializers.ModelSerializer):
    owner_email = serializers.ReadOnlyField(source='owner.email')
    latest_job = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            'id', 'name', 'description', 'source_type', 'repository_url',
            'status', 'file_count', 'symbol_count', 'chunk_count',
            'line_count', 'languages', 'metadata', 'owner', 'owner_email',
            'last_indexed_at', 'created_at', 'updated_at', 'latest_job'
        )
        read_only_fields = (
            'id', 'status', 'file_count', 'symbol_count', 'chunk_count',
            'line_count', 'languages', 'metadata', 'owner', 'owner_email',
            'last_indexed_at', 'created_at', 'updated_at', 'latest_job'
        )

    def get_latest_job(self, obj):
        job = obj.jobs.order_by('-created_at').first()
        if not job:
            return None
        return {
            'id': str(job.id),
            'job_type': job.job_type,
            'status': job.status,
            'progress': job.progress,
            'stage_message': job.stage_message,
            'error_message': job.error_message,
            'created_at': job.created_at,
            'completed_at': job.completed_at
        }
