import os
import zipfile
import hashlib
import tempfile
import requests
from typing import Dict, List, Any
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import SuspiciousFileOperation

from projects.models import Project
from repositories.models import RepositoryFile, CodeSymbol, CodeRelationship
from embeddings.models import CodeChunk
from embeddings.chunker import SemanticChunker
from embeddings.ai_service import get_ai_provider
from code_analysis.parsers import get_parser_for_file
from .models import AnalysisJob

IGNORE_DIRS = {
    '.git', 'node_modules', 'venv', '.venv', 'env', '__pycache__',
    '.pytest_cache', '.idea', '.vscode', 'dist', 'build', '.next',
    'target', 'bin', 'obj', 'vendor', '.gradle', 'coverage'
}

IGNORE_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.pdf', '.zip',
    '.tar', '.gz', '.rar', '.7z', '.exe', '.dll', '.so', '.dylib',
    '.pyc', '.pyo', '.class', '.wasm', '.woff', '.woff2', '.ttf',
    '.eot', '.mp3', '.mp4', '.mov', '.avi', '.lock', '.log'
}

LANGUAGE_MAP = {
    'py': 'python',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'java': 'java',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'html': 'html',
    'css': 'css',
    'dockerfile': 'dockerfile',
    'toml': 'toml',
    'xml': 'xml',
}

class IngestionService:
    @staticmethod
    def detect_language(filename: str) -> str:
        base = os.path.basename(filename).lower()
        if base == 'dockerfile':
            return 'dockerfile'
        if '.' in base:
            ext = base.split('.')[-1]
            return LANGUAGE_MAP.get(ext, 'text')
        return 'text'

    @classmethod
    def process_zip_archive(cls, project: Project, zip_file_path: str, job: AnalysisJob) -> None:
        """
        Safely extracts ZIP archive, parses files, symbols, chunks, and embeddings.
        Defends against Zip Slip / path traversal vulnerabilities.
        """
        temp_dir = tempfile.mkdtemp(prefix=f"codelens_{project.id}_")
        try:
            job.status = AnalysisJob.Status.RUNNING
            job.stage_message = "Extracting repository archive..."
            job.progress = 10
            job.save(update_fields=['status', 'stage_message', 'progress'])

            project.status = Project.Status.INDEXING
            project.save(update_fields=['status'])

            # 1. Safe extraction
            abs_temp_dir = os.path.abspath(temp_dir)
            with zipfile.ZipFile(zip_file_path, 'r') as zf:
                for member in zf.infolist():
                    target_path = os.path.abspath(os.path.join(temp_dir, member.filename))
                    if not target_path.startswith(abs_temp_dir):
                        raise SuspiciousFileOperation(f"Path traversal detected in archive: {member.filename}")
                zf.extractall(temp_dir)

            # If archive extracted into a single top-level folder, shift root
            extracted_items = os.listdir(temp_dir)
            root_dir = temp_dir
            if len(extracted_items) == 1 and os.path.isdir(os.path.join(temp_dir, extracted_items[0])):
                root_dir = os.path.join(temp_dir, extracted_items[0])

            # 2. Clear previous project data if reindexing
            with transaction.atomic():
                project.files.all().delete()
                project.symbols.all().delete()
                project.chunks.all().delete()
                project.relationships.all().delete()

            # 3. Collect and save repository files
            job.stage_message = "Reading and filtering codebase files..."
            job.progress = 25
            job.save(update_fields=['stage_message', 'progress'])

            discovered_files = []
            for root, dirs, files in os.walk(root_dir):
                # Prune ignored directories in-place
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith('.')]

                for f in files:
                    if f.startswith('.'):
                        continue
                    ext = os.path.splitext(f)[1].lower()
                    if ext in IGNORE_EXTENSIONS:
                        continue

                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(full_path, root_dir).replace('\\', '/')

                    # File size check (< 2MB per text file to prevent memory exhaustion)
                    file_size = os.path.getsize(full_path)
                    if file_size > 2 * 1024 * 1024:
                        continue

                    try:
                        with open(full_path, 'r', encoding='utf-8', errors='replace') as fp:
                            content = fp.read()
                    except Exception:
                        continue

                    lang = cls.detect_language(f)
                    content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
                    line_count = len(content.splitlines())

                    repo_file = RepositoryFile(
                        project=project,
                        path=rel_path,
                        language=lang,
                        size=file_size,
                        content_hash=content_hash,
                        line_count=line_count,
                        content=content
                    )
                    discovered_files.append(repo_file)

            # Bulk create files
            saved_files = RepositoryFile.objects.bulk_create(discovered_files)
            file_map = {f.path: f for f in saved_files}

            # 4. Parse Code Symbols & Relationships
            job.stage_message = "Analyzing code AST, functions, classes, and routes..."
            job.progress = 45
            job.save(update_fields=['stage_message', 'progress'])

            all_symbols_to_create = []
            all_relations_to_create = []
            symbol_lookup = {}

            for repo_file in saved_files:
                parser = get_parser_for_file(repo_file.path, repo_file.language)
                parsed_symbols, parsed_relations = parser.parse(repo_file.content, repo_file.path)

                for ps in parsed_symbols:
                    sym_obj = CodeSymbol(
                        project=project,
                        file=repo_file,
                        symbol_type=ps.symbol_type,
                        name=ps.name,
                        start_line=ps.start_line,
                        end_line=ps.end_line,
                        signature=ps.signature,
                        docstring=ps.docstring,
                        metadata=ps.metadata
                    )
                    all_symbols_to_create.append(sym_obj)

            created_symbols = CodeSymbol.objects.bulk_create(all_symbols_to_create)
            for sym in created_symbols:
                symbol_lookup[(sym.file_id, sym.name)] = sym

            # Match relationships
            for repo_file in saved_files:
                parser = get_parser_for_file(repo_file.path, repo_file.language)
                _, parsed_relations = parser.parse(repo_file.content, repo_file.path)

                file_syms = [s for s in created_symbols if s.file_id == repo_file.id]
                default_source = file_syms[0] if file_syms else None

                for pr in parsed_relations:
                    source_sym = None
                    for s in file_syms:
                        if s.name == pr.source_name:
                            source_sym = s
                            break
                    if not source_sym:
                        source_sym = default_source

                    if source_sym:
                        all_relations_to_create.append(CodeRelationship(
                            project=project,
                            source_symbol=source_sym,
                            target_name=pr.target_name,
                            relationship_type=pr.relationship_type
                        ))

            CodeRelationship.objects.bulk_create(all_relations_to_create)

            # 5. Semantic Chunking
            job.stage_message = "Generating semantic code chunks..."
            job.progress = 65
            job.save(update_fields=['stage_message', 'progress'])

            chunker = SemanticChunker()
            chunks_to_create = []
            chunk_texts_for_embedding = []

            for repo_file in saved_files:
                file_chunks = chunker.chunk_file(repo_file)
                for idx, c in enumerate(file_chunks):
                    chunk_obj = CodeChunk(
                        project=project,
                        file=repo_file,
                        chunk_index=idx,
                        symbol_name=c.get('symbol_name', ''),
                        content=c['content'],
                        start_line=c['start_line'],
                        end_line=c['end_line'],
                        metadata=c.get('metadata', {})
                    )
                    chunks_to_create.append(chunk_obj)
                    chunk_texts_for_embedding.append(c['content'])

            # 6. Embeddings Generation
            job.stage_message = "Generating vector embeddings for repository RAG..."
            job.progress = 80
            job.save(update_fields=['stage_message', 'progress'])

            ai_provider = get_ai_provider()
            embeddings_list = ai_provider.get_embeddings(chunk_texts_for_embedding)

            for chunk_obj, emb in zip(chunks_to_create, embeddings_list):
                chunk_obj.embedding = emb

            CodeChunk.objects.bulk_create(chunks_to_create)

            # 7. Calculate Statistical Summaries
            job.stage_message = "Finalizing project statistics..."
            job.progress = 95
            job.save(update_fields=['stage_message', 'progress'])

            lang_counts = {}
            total_lines = 0
            for f in saved_files:
                total_lines += f.line_count
                lang_counts[f.language] = lang_counts.get(f.language, 0) + 1

            project.file_count = len(saved_files)
            project.symbol_count = len(created_symbols)
            project.chunk_count = len(chunks_to_create)
            project.line_count = total_lines
            project.languages = lang_counts
            project.status = Project.Status.READY
            project.last_indexed_at = timezone.now()
            project.save()

            job.status = AnalysisJob.Status.COMPLETED
            job.progress = 100
            job.stage_message = "Repository indexing completed successfully."
            job.completed_at = timezone.now()
            job.save()

        except Exception as e:
            job.status = AnalysisJob.Status.FAILED
            job.error_message = str(e)
            job.stage_message = f"Failed: {str(e)}"
            job.completed_at = timezone.now()
            job.save()

            project.status = Project.Status.FAILED
            project.save(update_fields=['status'])
            raise
        finally:
            # Clean up temp folder
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)

    @classmethod
    def download_github_repository(cls, github_url: str) -> str:
        """
        Downloads a public GitHub repository as a ZIP file.
        Format: https://github.com/owner/repo
        """
        url = github_url.strip().rstrip('/')
        parts = url.split('/')
        if len(parts) < 5 or 'github.com' not in parts[2]:
            raise ValueError("Invalid GitHub URL. Must be in format: https://github.com/owner/repository")

        owner = parts[3]
        repo = parts[4].replace('.git', '')

        # Try main branch first, then master
        for branch in ['main', 'master']:
            archive_url = f"https://github.com/{owner}/{repo}/archive/refs/heads/{branch}.zip"
            try:
                res = requests.get(archive_url, stream=True, timeout=30)
                if res.status_code == 200:
                    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
                    for chunk in res.iter_content(chunk_size=65536):
                        if chunk:
                            temp_zip.write(chunk)
                    temp_zip.close()
                    return temp_zip.name
            except Exception:
                continue

        raise ValueError(f"Could not download repository archive from {github_url}. Verify the repository is public and accessible.")
