import math
from typing import List, Dict, Any, Tuple
from django.conf import settings
from projects.models import Project
from .models import CodeChunk
from .ai_service import get_ai_provider

class VectorRetrievalService:
    @staticmethod
    def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        if not vec_a or not vec_b:
            return 0.0
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return dot / (norm_a * norm_b)

    @classmethod
    def retrieve_relevant_chunks(
        cls,
        project: Project,
        query: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top code chunks relevant to the query strictly within the specified project.
        Enforces strict cross-project isolation.
        """
        ai_provider = get_ai_provider()
        query_vectors = ai_provider.get_embeddings([query])
        query_vec = query_vectors[0] if query_vectors else []

        # If PostgreSQL pgvector is enabled
        if getattr(settings, 'USE_PGVECTOR', False):
            try:
                from pgvector.django import CosineDistance
                chunks_qs = (
                    CodeChunk.objects
                    .filter(project=project)
                    .annotate(distance=CosineDistance('embedding', query_vec))
                    .order_by('distance')[:top_k]
                )
                results = []
                for c in chunks_qs:
                    results.append({
                        'id': str(c.id),
                        'content': c.content,
                        'start_line': c.start_line,
                        'end_line': c.end_line,
                        'symbol_name': c.symbol_name,
                        'file_path': c.file.path,
                        'file_id': str(c.file.id),
                        'metadata': c.metadata,
                        'score': round(1.0 - getattr(c, 'distance', 0.5), 4)
                    })
                return results
            except Exception:
                pass # Fallback to in-memory calculation below

        # Universal fallback (SQLite or Python-based cosine search)
        chunks_qs = CodeChunk.objects.filter(project=project).select_related('file')
        scored_chunks = []
        query_lower = query.lower()

        for c in chunks_qs:
            emb = c.embedding
            if isinstance(emb, str):
                import json
                try:
                    emb = json.loads(emb)
                except Exception:
                    emb = []
            
            sim = cls._cosine_similarity(query_vec, emb) if emb else 0.0

            # Keyword / Symbol boost (Hybrid retrieval)
            if c.symbol_name and c.symbol_name.lower() in query_lower:
                sim += 0.35
            if c.file.path.lower() in query_lower:
                sim += 0.40

            scored_chunks.append((sim, c))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_items = scored_chunks[:top_k]

        results = []
        for sim, c in top_items:
            results.append({
                'id': str(c.id),
                'content': c.content,
                'start_line': c.start_line,
                'end_line': c.end_line,
                'symbol_name': c.symbol_name,
                'file_path': c.file.path,
                'file_id': str(c.file.id),
                'metadata': c.metadata,
                'score': round(sim, 4)
            })

        return results
