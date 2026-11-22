import re
from typing import List, Dict, Any
from repositories.models import RepositoryFile, CodeSymbol

class SemanticChunker:
    """
    Code-aware semantic chunker that splits code by symbol boundaries
    (functions, classes, routes) and falls back to sliding line blocks for
    unsupported formats or configuration files.
    """
    def __init__(self, max_chunk_lines: int = 80, overlap_lines: int = 10):
        self.max_chunk_lines = max_chunk_lines
        self.overlap_lines = overlap_lines

    def chunk_file(self, file_obj: RepositoryFile) -> List[Dict[str, Any]]:
        content = file_obj.content or ""
        lines = content.splitlines()
        total_lines = len(lines)

        if total_lines == 0:
            return []

        chunks = []
        symbols = list(file_obj.symbols.all().order_by('start_line'))

        # If file has structured symbols (functions, classes, routes)
        if symbols:
            covered_lines = set()
            for sym in symbols:
                s_line = max(1, sym.start_line)
                e_line = min(total_lines, max(sym.end_line, s_line))
                
                # If symbol is very large, split into sub-chunks
                if (e_line - s_line + 1) > self.max_chunk_lines:
                    curr = s_line
                    while curr <= e_line:
                        sub_end = min(e_line, curr + self.max_chunk_lines - 1)
                        chunk_text = "\n".join(lines[curr - 1 : sub_end])
                        chunks.append({
                            'content': chunk_text,
                            'start_line': curr,
                            'end_line': sub_end,
                            'symbol_name': sym.name,
                            'metadata': {
                                'symbol_type': sym.symbol_type,
                                'signature': sym.signature,
                                'file_path': file_obj.path,
                                'language': file_obj.language,
                            }
                        })
                        for l in range(curr, sub_end + 1):
                            covered_lines.add(l)
                        curr += (self.max_chunk_lines - self.overlap_lines)
                else:
                    chunk_text = "\n".join(lines[s_line - 1 : e_line])
                    chunks.append({
                        'content': chunk_text,
                        'start_line': s_line,
                        'end_line': e_line,
                        'symbol_name': sym.name,
                        'metadata': {
                            'symbol_type': sym.symbol_type,
                            'signature': sym.signature,
                            'file_path': file_obj.path,
                            'language': file_obj.language,
                        }
                    })
                    for l in range(s_line, e_line + 1):
                        covered_lines.add(l)

            # Chunk uncovered parts (e.g. top-level imports or configuration)
            uncovered_start = None
            for idx in range(1, total_lines + 1):
                if idx not in covered_lines:
                    if uncovered_start is None:
                        uncovered_start = idx
                else:
                    if uncovered_start is not None:
                        u_end = idx - 1
                        if u_end - uncovered_start >= 3: # Ignore tiny 1-2 line gaps
                            chunk_text = "\n".join(lines[uncovered_start - 1 : u_end])
                            chunks.append({
                                'content': chunk_text,
                                'start_line': uncovered_start,
                                'end_line': u_end,
                                'symbol_name': 'module_scope',
                                'metadata': {
                                    'file_path': file_obj.path,
                                    'language': file_obj.language,
                                }
                            })
                        uncovered_start = None

            if uncovered_start is not None:
                chunk_text = "\n".join(lines[uncovered_start - 1 : total_lines])
                chunks.append({
                    'content': chunk_text,
                    'start_line': uncovered_start,
                    'end_line': total_lines,
                    'symbol_name': 'module_scope',
                    'metadata': {
                        'file_path': file_obj.path,
                        'language': file_obj.language,
                    }
                })

        else:
            # Fallback sliding window for config/docs/scripts without parsed symbols
            curr = 1
            while curr <= total_lines:
                chunk_end = min(total_lines, curr + self.max_chunk_lines - 1)
                chunk_text = "\n".join(lines[curr - 1 : chunk_end])
                chunks.append({
                    'content': chunk_text,
                    'start_line': curr,
                    'end_line': chunk_end,
                    'symbol_name': '',
                    'metadata': {
                        'file_path': file_obj.path,
                        'language': file_obj.language,
                    }
                })
                if chunk_end == total_lines:
                    break
                curr += (self.max_chunk_lines - self.overlap_lines)

        return chunks
