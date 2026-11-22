import os
import math
import hashlib
import json
import logging
from typing import List, Dict, Any, Tuple
from django.conf import settings
import requests

logger = logging.getLogger(__name__)

class BaseAIProvider:
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        raise NotImplementedError

    def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        context_chunks: List[Dict[str, Any]],
        system_prompt: str = ""
    ) -> Tuple[str, List[Dict[str, Any]]]:
        raise NotImplementedError

class MockLocalAIProvider(BaseAIProvider):
    """
    Deterministic local AI engine that operates completely offline with
    no API keys required. Computes real cosine similarity scores and
    grounded responses with source code citations.
    """
    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def _hash_embed(self, text: str) -> List[float]:
        vec = [0.0] * self.dimension
        words = text.lower().split()
        if not words:
            return vec

        for word in words:
            # Hash word and n-grams
            h = int(hashlib.sha256(word.encode('utf-8')).hexdigest(), 16)
            idx = h % self.dimension
            sign = 1.0 if ((h >> 8) & 1) else -1.0
            weight = math.log1p(len(word))
            vec[idx] += sign * weight

        # Normalize to unit length (L2 norm)
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        return [self._hash_embed(t) for t in texts]

    def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        context_chunks: List[Dict[str, Any]],
        system_prompt: str = ""
    ) -> Tuple[str, List[Dict[str, Any]]]:
        user_query = messages[-1]['content'] if messages else ""
        citations = []

        if not context_chunks:
            return (
                f"I searched the repository for **'{user_query}'**, but could not find any relevant source code, files, or symbols matching your query. "
                "Please verify the question or check if the relevant files are included in the repository index.",
                []
            )

        # Build citations from top chunks
        summary_points = []
        for chunk in context_chunks[:4]:
            meta = chunk.get('metadata', {})
            file_path = meta.get('file_path') or chunk.get('file_path', 'unknown')
            s_line = chunk.get('start_line', 1)
            e_line = chunk.get('end_line', s_line)
            symbol = chunk.get('symbol_name') or 'code block'
            snippet = chunk.get('content', '')[:300]

            citation = {
                'file': file_path,
                'start_line': s_line,
                'end_line': e_line,
                'symbol': symbol,
                'snippet': snippet
            }
            citations.append(citation)

            summary_points.append(
                f"- **`{file_path}` (lines {s_line}–{e_line})**: Defined `{symbol}`.\n"
                f"  ```\n  {snippet.strip().splitlines()[0] if snippet.strip() else ''}\n  ```"
            )

        explanation = (
            f"Based on the repository source code evidence for **\"{user_query}\"**:\n\n"
            f"1. **Implementation Overview**:\n"
            f"   The requested functionality is primarily implemented across the following components:\n\n"
            + "\n".join(summary_points) + "\n\n"
            f"2. **Detailed Context**:\n"
            f"   In `{citations[0]['file']}` lines {citations[0]['start_line']}–{citations[0]['end_line']}, "
            f"the component `{citations[0]['symbol']}` handles the logic. "
            f"Review the cited lines directly in the Monaco code viewer for full implementation details."
        )

        return explanation, citations

class OpenAIProvider(BaseAIProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model
        self.local_fallback = MockLocalAIProvider()

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            return self.local_fallback.get_embeddings(texts)
        try:
            res = requests.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"input": texts, "model": "text-embedding-3-small"},
                timeout=15
            )
            if res.status_code == 200:
                data = res.json()
                return [item['embedding'] for item in data['data']]
        except Exception as e:
            logger.warning("OpenAI embedding API failed (%s), falling back to local embedder.", e)
        return self.local_fallback.get_embeddings(texts)

    def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        context_chunks: List[Dict[str, Any]],
        system_prompt: str = ""
    ) -> Tuple[str, List[Dict[str, Any]]]:
        if not self.api_key:
            return self.local_fallback.generate_chat_response(messages, context_chunks, system_prompt)

        # Format context into prompt
        context_text = "\n\n---\n\n".join([
            f"File: {c.get('metadata', {}).get('file_path', c.get('file_path'))} (lines {c.get('start_line')}-{c.get('end_line')})\n"
            f"Symbol: {c.get('symbol_name', 'code')}\n"
            f"Code:\n{c.get('content')}"
            for c in context_chunks
        ])

        system_instruction = (
            system_prompt or
            "You are CodeLens, an AI Software Repository Intelligence System. "
            "Explain the repository strictly using the provided context chunks. "
            "Cite every statement with file path and line numbers, e.g. [path/to/file.ext#L10-L25]. "
            "If the answer cannot be determined from the code, state that clearly."
        )

        formatted_messages = [
            {"role": "system", "content": f"{system_instruction}\n\nRepository Context:\n{context_text}"}
        ]
        formatted_messages.extend(messages)

        try:
            res = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model, "messages": formatted_messages, "temperature": 0.2},
                timeout=30
            )
            if res.status_code == 200:
                ans = res.json()['choices'][0]['message']['content']
                # Collect citations from context
                citations = [
                    {
                        'file': c.get('metadata', {}).get('file_path', c.get('file_path')),
                        'start_line': c.get('start_line'),
                        'end_line': c.get('end_line'),
                        'symbol': c.get('symbol_name'),
                        'snippet': c.get('content', '')[:250]
                    }
                    for c in context_chunks[:4]
                ]
                return ans, citations
        except Exception as e:
            logger.warning("OpenAI chat completion failed (%s), falling back to local engine.", e)

        return self.local_fallback.generate_chat_response(messages, context_chunks, system_prompt)

def get_ai_provider() -> BaseAIProvider:
    provider = getattr(settings, 'AI_PROVIDER', 'mock').lower()
    openai_key = getattr(settings, 'OPENAI_API_KEY', '')

    if provider == 'openai' and openai_key:
        return OpenAIProvider(api_key=openai_key, model=getattr(settings, 'AI_MODEL_NAME', 'gpt-4o-mini'))
    return MockLocalAIProvider(dimension=getattr(settings, 'EMBEDDING_DIMENSION', 384))
