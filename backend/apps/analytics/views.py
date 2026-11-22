from django.db.models import Count, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.models import User
from accounts.permissions import IsAdminRole
from projects.models import Project
from repositories.models import RepositoryFile, CodeSymbol
from embeddings.models import CodeChunk
from ingestion.models import AnalysisJob

class SystemAnalyticsView(APIView):
    """
    Administrative overview of repository ingestion jobs, user metrics,
    and system operational health.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        total_users = User.objects.count()
        total_projects = Project.objects.count()
        total_files = RepositoryFile.objects.count()
        total_symbols = CodeSymbol.objects.count()
        total_chunks = CodeChunk.objects.count()

        # Jobs metrics
        jobs_qs = AnalysisJob.objects.all()
        job_stats = {
            'total': jobs_qs.count(),
            'pending': jobs_qs.filter(status=AnalysisJob.Status.PENDING).count(),
            'running': jobs_qs.filter(status=AnalysisJob.Status.RUNNING).count(),
            'completed': jobs_qs.filter(status=AnalysisJob.Status.COMPLETED).count(),
            'failed': jobs_qs.filter(status=AnalysisJob.Status.FAILED).count(),
        }

        recent_jobs = [
            {
                'id': str(j.id),
                'project_id': str(j.project.id),
                'project_name': j.project.name,
                'job_type': j.job_type,
                'status': j.status,
                'progress': j.progress,
                'stage_message': j.stage_message,
                'error_message': j.error_message,
                'created_at': j.created_at,
                'completed_at': j.completed_at
            }
            for j in jobs_qs.order_by('-created_at')[:15]
        ]

        # Top languages across platform
        lang_counts = (
            RepositoryFile.objects
            .values('language')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )

        return Response({
            'metrics': {
                'total_users': total_users,
                'total_projects': total_projects,
                'total_files': total_files,
                'total_symbols': total_symbols,
                'total_chunks': total_chunks,
            },
            'jobs': job_stats,
            'recent_jobs': recent_jobs,
            'languages': lang_counts,
        })

class ProjectAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        try:
            if request.user.is_admin:
                project = Project.objects.get(id=project_id)
            else:
                project = Project.objects.get(id=project_id, owner=request.user)
        except Project.DoesNotExist:
            return Response({"detail": "Project not found."}, status=404)

        symbols_breakdown = (
            CodeSymbol.objects
            .filter(project=project)
            .values('symbol_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        file_sizes = (
            RepositoryFile.objects
            .filter(project=project)
            .values('language')
            .annotate(lines=Sum('line_count'), count=Count('id'))
            .order_by('-lines')
        )

        return Response({
            'project_name': project.name,
            'languages': project.languages,
            'symbols_breakdown': symbols_breakdown,
            'file_distribution': file_sizes,
            'file_count': project.file_count,
            'line_count': project.line_count,
            'symbol_count': project.symbol_count,
            'chunk_count': project.chunk_count,
        })
