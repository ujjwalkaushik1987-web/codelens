import os
import tempfile
from django.conf import settings
from django.db.models import Count
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsOwnerOrAdmin
from .models import Project
from .serializers import ProjectSerializer

from repositories.models import RepositoryFile
from repositories.serializers import RepositoryFileListSerializer, RepositoryFileDetailSerializer
from ingestion.models import AnalysisJob
from ingestion.services import IngestionService
from ingestion.tasks import index_repository_task, download_and_index_github_task
from code_analysis.services import ArchitectureGraphService, ImpactAnalysisService
from documentation.services import DocumentationGeneratorService
from documentation.serializers import GeneratedDocumentSerializer
from security_analysis.scanner import SecurityScannerService
from security_analysis.serializers import SecurityFindingSerializer
from conversations.models import Conversation
from conversations.serializers import ConversationSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Project.objects.all().select_related('owner').prefetch_related('jobs')
        return Project.objects.filter(owner=user).select_related('owner').prefetch_related('jobs')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        project = self.get_object()
        latest_job = project.jobs.order_by('-created_at').first()
        return Response({
            "status": project.status,
            "file_count": project.file_count,
            "symbol_count": project.symbol_count,
            "chunk_count": project.chunk_count,
            "line_count": project.line_count,
            "languages": project.languages,
            "last_indexed_at": project.last_indexed_at,
            "job": {
                "id": str(latest_job.id),
                "job_type": latest_job.job_type,
                "status": latest_job.status,
                "progress": latest_job.progress,
                "stage_message": latest_job.stage_message,
                "error_message": latest_job.error_message,
            } if latest_job else None
        })

    @action(detail=True, methods=['post'])
    def upload(self, request, pk=None):
        project = self.get_object()
        file_obj = request.FILES.get('file')

        if not file_obj:
            return Response(
                {"detail": "No file uploaded. Please select a valid .zip codebase archive."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not file_obj.name.lower().endswith('.zip'):
            return Response(
                {"detail": "Invalid file format. Only .zip archives are supported."},
                status=status.HTTP_400_BAD_REQUEST
            )

        max_upload = getattr(settings, 'MAX_UPLOAD_SIZE', 50 * 1024 * 1024)
        if file_obj.size > max_upload:
            return Response(
                {"detail": f"File exceeds maximum allowed size ({max_upload // (1024 * 1024)} MB)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save uploaded zip to temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        for chunk in file_obj.chunks():
            temp_file.write(chunk)
        temp_file.close()

        # Create job
        job = AnalysisJob.objects.create(
            project=project,
            job_type=AnalysisJob.JobType.INDEXING,
            status=AnalysisJob.Status.PENDING,
            stage_message="Queued for extraction and indexing"
        )

        project.status = Project.Status.INDEXING
        project.source_type = Project.SourceType.ZIP
        project.save(update_fields=['status', 'source_type'])

        # Trigger processing (Celery async or direct synchronous execution)
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            # Run synchronously in-process
            try:
                IngestionService.process_zip_archive(project, temp_file.name, job)
            finally:
                if os.path.exists(temp_file.name):
                    os.remove(temp_file.name)
        else:
            try:
                index_repository_task.delay(str(project.id), temp_file.name, str(job.id))
            except Exception:
                # If Redis is unavailable, fallback to eager run
                try:
                    IngestionService.process_zip_archive(project, temp_file.name, job)
                finally:
                    if os.path.exists(temp_file.name):
                        os.remove(temp_file.name)

        return Response({
            "message": "Repository uploaded and indexing started.",
            "job_id": str(job.id),
            "project_id": str(project.id)
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['post'], url_path='github-connect')
    def github_connect(self, request, pk=None):
        project = self.get_object()
        github_url = request.data.get('url', '').strip()

        if not github_url or 'github.com' not in github_url:
            return Response(
                {"detail": "Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        job = AnalysisJob.objects.create(
            project=project,
            job_type=AnalysisJob.JobType.INDEXING,
            status=AnalysisJob.Status.PENDING,
            stage_message="Queued to download and index GitHub repository"
        )

        project.status = Project.Status.INDEXING
        project.source_type = Project.SourceType.GITHUB
        project.repository_url = github_url
        project.save(update_fields=['status', 'source_type', 'repository_url'])

        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            temp_zip = None
            try:
                temp_zip = IngestionService.download_github_repository(github_url)
                IngestionService.process_zip_archive(project, temp_zip, job)
            finally:
                if temp_zip and os.path.exists(temp_zip):
                    os.remove(temp_zip)
        else:
            try:
                download_and_index_github_task.delay(str(project.id), github_url, str(job.id))
            except Exception:
                temp_zip = None
                try:
                    temp_zip = IngestionService.download_github_repository(github_url)
                    IngestionService.process_zip_archive(project, temp_zip, job)
                finally:
                    if temp_zip and os.path.exists(temp_zip):
                        os.remove(temp_zip)

        return Response({
            "message": "GitHub repository connected and indexing initiated.",
            "job_id": str(job.id),
            "project_id": str(project.id)
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['post'])
    def reindex(self, request, pk=None):
        project = self.get_object()
        if project.source_type == Project.SourceType.GITHUB and project.repository_url:
            return self.github_connect(request, pk=pk)

        # For ZIP, re-chunk and re-parse existing files in database
        job = AnalysisJob.objects.create(
            project=project,
            job_type=AnalysisJob.JobType.REINDEXING,
            status=AnalysisJob.Status.RUNNING,
            stage_message="Re-parsing and re-indexing codebase..."
        )
        
        # Trigger re-scan of security and docs
        SecurityScannerService.scan_project(project)
        DocumentationGeneratorService.generate_all_docs(project)

        job.status = AnalysisJob.Status.COMPLETED
        job.progress = 100
        job.stage_message = "Re-indexing completed."
        job.save()

        return Response({"message": "Reindexing completed successfully.", "job_id": str(job.id)})

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        project = self.get_object()
        files_qs = RepositoryFile.objects.filter(project=project).annotate(symbol_count=Count('symbols')).order_by('path')
        
        search = request.query_params.get('search', '').strip()
        if search:
            files_qs = files_qs.filter(path__icontains=search)

        language = request.query_params.get('language', '').strip()
        if language:
            files_qs = files_qs.filter(language=language)

        serializer = RepositoryFileListSerializer(files_qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='files/(?P<file_id>[^/.]+)')
    def file_detail(self, request, pk=None, file_id=None):
        project = self.get_object()
        try:
            repo_file = RepositoryFile.objects.prefetch_related('symbols').get(project=project, id=file_id)
        except RepositoryFile.DoesNotExist:
            return Response({"detail": "File not found in project."}, status=status.HTTP_404_NOT_FOUND)

        serializer = RepositoryFileDetailSerializer(repo_file)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def architecture(self, request, pk=None):
        project = self.get_object()
        graph_data = ArchitectureGraphService.build_graph(project)
        return Response(graph_data)

    @action(detail=True, methods=['post'], url_path='impact-analysis')
    def impact_analysis(self, request, pk=None):
        project = self.get_object()
        target_path = request.data.get('file_path') or request.data.get('target')

        if not target_path:
            # Pick first file if none provided
            first_f = project.files.first()
            target_path = first_f.path if first_f else ""

        if not target_path:
            return Response({"detail": "Repository has no files to analyze."}, status=status.HTTP_400_BAD_REQUEST)

        symbol_name = request.data.get('symbol_name')
        analysis = ImpactAnalysisService.analyze_impact(project, target_path, symbol_name)
        return Response(analysis)

    @action(detail=True, methods=['get', 'post'])
    def documentation(self, request, pk=None):
        project = self.get_object()

        if request.method == 'POST':
            docs = DocumentationGeneratorService.generate_all_docs(project)
            return Response({
                "message": "Documentation generated successfully.",
                "documents": GeneratedDocumentSerializer(docs.values(), many=True).data
            })

        # GET existing docs or generate if none exist
        docs = project.documents.all()
        if not docs.exists() and project.files.exists():
            docs_dict = DocumentationGeneratorService.generate_all_docs(project)
            docs = docs_dict.values()

        return Response(GeneratedDocumentSerializer(docs, many=True).data)

    @action(detail=True, methods=['get', 'post'], url_path='security-scan')
    def security_scan(self, request, pk=None):
        project = self.get_object()

        if request.method == 'POST':
            findings = SecurityScannerService.scan_project(project)
            return Response({
                "message": f"Security scan completed. Found {len(findings)} potential finding(s).",
                "findings": SecurityFindingSerializer(findings, many=True).data
            })

        findings = project.security_findings.all().select_related('file')
        if not findings.exists() and project.files.exists():
            findings = SecurityScannerService.scan_project(project)

        return Response(SecurityFindingSerializer(findings, many=True).data)

    @action(detail=True, methods=['get', 'post'])
    def conversations(self, request, pk=None):
        project = self.get_object()

        if request.method == 'POST':
            title = request.data.get('title', 'New CodeLens Conversation').strip()
            conv = Conversation.objects.create(
                project=project,
                user=request.user,
                title=title
            )
            return Response(ConversationSerializer(conv).data, status=status.HTTP_201_CREATED)

        convs = project.conversations.filter(user=request.user).order_by('-updated_at')
        return Response(ConversationSerializer(convs, many=True).data)
