import os
from collections import defaultdict, deque
from typing import Dict, List, Any, Set
from projects.models import Project
from repositories.models import RepositoryFile, CodeSymbol, CodeRelationship

class ArchitectureGraphService:
    @staticmethod
    def build_graph(project: Project) -> Dict[str, Any]:
        """
        Builds an interactive architecture and dependency graph of the codebase.
        Nodes: files and modules.
        Edges: imports and calls.
        """
        files = RepositoryFile.objects.filter(project=project)
        symbols = CodeSymbol.objects.filter(project=project)
        relationships = CodeRelationship.objects.filter(project=project).select_related('source_symbol', 'target_symbol')

        nodes = []
        edges = []
        modules = set()

        # Build file & module nodes
        for f in files:
            dir_name = os.path.dirname(f.path) or 'root'
            modules.add(dir_name)
            sym_count = symbols.filter(file=f).count()

            nodes.append({
                'id': f.path,
                'label': os.path.basename(f.path),
                'type': 'file',
                'language': f.language,
                'module': dir_name,
                'lineCount': f.line_count,
                'symbolCount': sym_count,
                'fileId': str(f.id)
            })

        # Add module container nodes
        for mod in modules:
            nodes.append({
                'id': f"mod::{mod}",
                'label': mod,
                'type': 'module',
                'module': mod
            })

        # Build file-to-file and symbol-to-symbol edges
        # 1. Structural file-in-module edges
        for f in files:
            dir_name = os.path.dirname(f.path) or 'root'
            edges.append({
                'id': f"e_mod_{f.path}",
                'source': f"mod::{dir_name}",
                'target': f.path,
                'type': 'contains',
                'label': 'contains'
            })

        # 2. Dependency edges
        edge_set = set()
        for rel in relationships:
            source_file = rel.source_symbol.file.path if rel.source_symbol else ""
            target_name = rel.target_name

            # Match target_name to a file in the project
            matched_target_file = None
            for f in files:
                f_no_ext = os.path.splitext(f.path)[0].replace('/', '.')
                if target_name in f.path or target_name.replace('.', '/') in f.path or f_no_ext.endswith(target_name):
                    matched_target_file = f.path
                    break

            if source_file and matched_target_file and source_file != matched_target_file:
                edge_key = (source_file, matched_target_file, rel.relationship_type)
                if edge_key not in edge_set:
                    edge_set.add(edge_key)
                    edges.append({
                        'id': f"e_{len(edges)}_{source_file}_{matched_target_file}",
                        'source': source_file,
                        'target': matched_target_file,
                        'type': rel.relationship_type,
                        'label': rel.relationship_type
                    })

        return {
            'nodes': nodes,
            'edges': edges,
            'modules': list(modules),
            'stats': {
                'totalNodes': len(nodes),
                'totalEdges': len(edges),
                'totalFiles': files.count(),
                'totalModules': len(modules),
                'totalSymbols': symbols.count()
            }
        }

class ImpactAnalysisService:
    @staticmethod
    def analyze_impact(project: Project, target_path: str, target_symbol_name: str = None) -> Dict[str, Any]:
        """
        Calculates direct and transitive blast radius of changes to a file or symbol.
        Uses BFS graph reachability through imports and calls.
        """
        files = list(RepositoryFile.objects.filter(project=project))
        file_map = {f.path: f for f in files}

        if target_path not in file_map:
            for p in file_map:
                if p.endswith(target_path) or target_path.endswith(p):
                    target_path = p
                    break

        if target_path not in file_map:
            return {
                'error': f"File '{target_path}' not found in project.",
                'target': target_path,
                'affected_files': [],
                'direct_impact_count': 0,
                'transitive_impact_count': 0
            }

        relationships = CodeRelationship.objects.filter(project=project).select_related('source_symbol', 'target_symbol')
        
        # Build inverted adjacency graph: target_file -> list of source_files that import/call it
        dependents_graph = defaultdict(set)
        relationship_details = defaultdict(list)

        for rel in relationships:
            source_file = rel.source_symbol.file.path
            target_name = rel.target_name

            target_norm = target_name.replace('.', '/')
            target_base = target_name.split('.')[-1]

            # Check if relationship targets our files
            for path in file_map:
                path_stem = os.path.splitext(path)[0].replace('/', '.')
                path_norm = os.path.splitext(path)[0]
                path_base = os.path.splitext(os.path.basename(path))[0]

                if (target_name in path or 
                    target_norm in path or 
                    target_norm == path_norm or
                    path.endswith(target_name) or 
                    path_stem.endswith(target_name) or
                    target_base == path_base):
                    if source_file != path:
                        dependents_graph[path].add(source_file)
                        relationship_details[(source_file, path)].append({
                            'source_symbol': rel.source_symbol.name,
                            'target_name': target_name,
                            'type': rel.relationship_type,
                            'line': rel.source_symbol.start_line
                        })

        # BFS Traversal
        visited_depth = {}
        queue = deque([(target_path, 0)])
        visited_depth[target_path] = 0

        while queue:
            current, depth = queue.popleft()
            if depth >= 4: # Max blast radius depth
                continue

            for neighbor in dependents_graph[current]:
                if neighbor not in visited_depth:
                    visited_depth[neighbor] = depth + 1
                    queue.append((neighbor, depth + 1))

        # Format affected components
        affected_list = []
        direct_count = 0
        transitive_count = 0

        for path, depth in visited_depth.items():
            if path == target_path:
                continue

            f_obj = file_map.get(path)
            severity = 'HIGH' if depth == 1 else ('MEDIUM' if depth == 2 else 'LOW')
            confidence = 'high' if depth == 1 else 'medium'
            
            if depth == 1:
                direct_count += 1
            else:
                transitive_count += 1

            # Get citations / evidence
            reasons = relationship_details.get((path, target_path), [])
            reason_text = []
            if reasons:
                for r in reasons:
                    reason_text.append(f"Line {r['line']}: {r['source_symbol']} {r['type']} {r['target_name']}")
            else:
                reason_text.append(f"Transitively depends on {target_path} at depth {depth}")

            affected_list.append({
                'path': path,
                'file_id': str(f_obj.id) if f_obj else None,
                'depth': depth,
                'severity': severity,
                'confidence': confidence,
                'explanation': "; ".join(reason_text),
                'reasons': reasons,
                'line_count': f_obj.line_count if f_obj else 0
            })

        # Sort by depth ascending, then severity
        affected_list.sort(key=lambda x: (x['depth'], x['path']))

        # Synthesize recommendation
        recommendation = (
            f"Modifying '{target_path}' directly impacts {direct_count} component(s) "
            f"and transitively propagates to {transitive_count} downstream component(s). "
            f"Run integration tests covering {', '.join([a['path'] for a in affected_list[:3]])} before merging."
            if affected_list else
            f"File '{target_path}' has isolated scope with 0 detected downstream dependents in this repository."
        )

        return {
            'target_file': target_path,
            'target_symbol': target_symbol_name or 'Entire File',
            'direct_impact_count': direct_count,
            'transitive_impact_count': transitive_count,
            'total_affected': len(affected_list),
            'affected_components': affected_list,
            'recommendation': recommendation
        }
