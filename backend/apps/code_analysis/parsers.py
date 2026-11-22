import ast
import re
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass, field

@dataclass
class ParsedSymbol:
    symbol_type: str # 'function', 'class', 'method', 'import', 'route', 'model', 'service', 'variable'
    name: str
    start_line: int
    end_line: int
    signature: str = ""
    docstring: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ParsedRelation:
    source_name: str
    target_name: str
    relationship_type: str # 'imports', 'calls', 'inherits', 'references'
    metadata: Dict[str, Any] = field(default_factory=dict)

class BaseParser:
    def parse(self, code: str, file_path: str) -> Tuple[List[ParsedSymbol], List[ParsedRelation]]:
        raise NotImplementedError

class PythonParser(BaseParser):
    def parse(self, code: str, file_path: str) -> Tuple[List[ParsedSymbol], List[ParsedRelation]]:
        symbols: List[ParsedSymbol] = []
        relations: List[ParsedRelation] = []

        try:
            tree = ast.parse(code, filename=file_path)
        except Exception:
            # Fallback to regex-based extraction if AST parse fails (e.g. syntax error or partial code)
            return self._regex_fallback(code)

        lines = code.splitlines()

        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                # Import statements
                start_line = getattr(node, 'lineno', 1)
                end_line = getattr(node, 'end_lineno', start_line)
                import_stmt = lines[start_line - 1].strip() if 0 < start_line <= len(lines) else ""

                if isinstance(node, ast.Import):
                    for alias in node.names:
                        symbols.append(ParsedSymbol(
                            symbol_type='import',
                            name=alias.name,
                            start_line=start_line,
                            end_line=end_line,
                            signature=import_stmt,
                            metadata={'alias': alias.asname or alias.name}
                        ))
                        relations.append(ParsedRelation(
                            source_name=file_path,
                            target_name=alias.name,
                            relationship_type='imports'
                        ))
                elif isinstance(node, ast.ImportFrom) and node.module:
                    for alias in node.names:
                        full_name = f"{node.module}.{alias.name}"
                        symbols.append(ParsedSymbol(
                            symbol_type='import',
                            name=full_name,
                            start_line=start_line,
                            end_line=end_line,
                            signature=import_stmt,
                            metadata={'module': node.module, 'name': alias.name}
                        ))
                        relations.append(ParsedRelation(
                            source_name=file_path,
                            target_name=node.module,
                            relationship_type='imports'
                        ))

            elif isinstance(node, ast.ClassDef):
                start_line = getattr(node, 'lineno', 1)
                end_line = getattr(node, 'end_lineno', start_line)
                docstring = ast.get_docstring(node) or ""
                bases = []
                for b in node.bases:
                    if isinstance(b, ast.Name):
                        bases.append(b.id)
                    elif isinstance(b, ast.Attribute):
                        bases.append(b.attr)

                # Classify symbol: model, viewset, or regular class
                sym_type = 'class'
                if any('Model' in b for b in bases):
                    sym_type = 'model'
                elif any('View' in b or 'ViewSet' in b for b in bases):
                    sym_type = 'route'
                elif 'Service' in node.name:
                    sym_type = 'service'

                sig = f"class {node.name}({', '.join(bases)})"
                symbols.append(ParsedSymbol(
                    symbol_type=sym_type,
                    name=node.name,
                    start_line=start_line,
                    end_line=end_line,
                    signature=sig,
                    docstring=docstring,
                    metadata={'bases': bases}
                ))

                for base in bases:
                    relations.append(ParsedRelation(
                        source_name=node.name,
                        target_name=base,
                        relationship_type='inherits'
                    ))

            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                start_line = getattr(node, 'lineno', 1)
                end_line = getattr(node, 'end_lineno', start_line)
                docstring = ast.get_docstring(node) or ""

                args = [a.arg for a in node.args.args]
                is_async = isinstance(node, ast.AsyncFunctionDef)
                sig = f"{'async ' if is_async else ''}def {node.name}({', '.join(args)})"

                # Check decorator for routes (e.g. @app.route, @api_view, @router.get)
                is_route = False
                decorators = []
                for d in node.decorator_list:
                    if isinstance(d, ast.Name):
                        decorators.append(d.id)
                        if 'route' in d.id.lower() or 'api' in d.id.lower():
                            is_route = True
                    elif isinstance(d, ast.Call) and isinstance(d.func, (ast.Name, ast.Attribute)):
                        d_name = getattr(d.func, 'id', getattr(d.func, 'attr', ''))
                        decorators.append(d_name)
                        if any(k in d_name.lower() for k in ['route', 'get', 'post', 'put', 'delete', 'patch', 'api_view']):
                            is_route = True

                sym_type = 'route' if is_route else 'function'
                symbols.append(ParsedSymbol(
                    symbol_type=sym_type,
                    name=node.name,
                    start_line=start_line,
                    end_line=end_line,
                    signature=sig,
                    docstring=docstring,
                    metadata={'is_async': is_async, 'decorators': decorators, 'args': args}
                ))

                # Extract calls inside function
                for sub in ast.walk(node):
                    if isinstance(sub, ast.Call):
                        called = None
                        if isinstance(sub.func, ast.Name):
                            called = sub.func.id
                        elif isinstance(sub.func, ast.Attribute):
                            called = sub.func.attr
                        if called and called != node.name:
                            relations.append(ParsedRelation(
                                source_name=node.name,
                                target_name=called,
                                relationship_type='calls'
                            ))

        return symbols, relations

    def _regex_fallback(self, code: str) -> Tuple[List[ParsedSymbol], List[ParsedRelation]]:
        symbols: List[ParsedSymbol] = []
        relations: List[ParsedRelation] = []
        lines = code.splitlines()

        for idx, line in enumerate(lines, 1):
            line_str = line.strip()
            # Match class
            class_match = re.match(r'^class\s+([A-Za-z0-9_]+)(?:\((.*?)\))?:', line_str)
            if class_match:
                cls_name = class_match.group(1)
                bases = class_match.group(2) or ""
                symbols.append(ParsedSymbol(
                    symbol_type='class',
                    name=cls_name,
                    start_line=idx,
                    end_line=idx + 10,
                    signature=line_str
                ))
                if bases:
                    for base in [b.strip() for b in bases.split(',') if b.strip()]:
                        relations.append(ParsedRelation(
                            source_name=cls_name,
                            target_name=base,
                            relationship_type='inherits'
                        ))
            # Match function
            fn_match = re.match(r'^(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\((.*?)\):', line_str)
            if fn_match:
                fn_name = fn_match.group(1)
                symbols.append(ParsedSymbol(
                    symbol_type='function',
                    name=fn_name,
                    start_line=idx,
                    end_line=idx + 10,
                    signature=line_str
                ))
            # Match import
            imp_match = re.match(r'^(?:from\s+([A-Za-z0-9_.]+)\s+import\s+(.*)|import\s+(.*))', line_str)
            if imp_match:
                target = imp_match.group(1) or imp_match.group(3)
                if target:
                    symbols.append(ParsedSymbol(
                        symbol_type='import',
                        name=target.strip(),
                        start_line=idx,
                        end_line=idx,
                        signature=line_str
                    ))
                    relations.append(ParsedRelation(
                        source_name="",
                        target_name=target.strip(),
                        relationship_type='imports'
                    ))
        return symbols, relations

class JavaScriptTypeScriptParser(BaseParser):
    def parse(self, code: str, file_path: str) -> Tuple[List[ParsedSymbol], List[ParsedRelation]]:
        symbols: List[ParsedSymbol] = []
        relations: List[ParsedRelation] = []
        lines = code.splitlines()

        # Regular expressions for JS/TS
        import_regex = re.compile(r'''(?:import\s+(?:\{([^}]+)\}|\*\s+as\s+([A-Za-z0-9_]+)|([A-Za-z0-9_]+))\s+from\s+['"]([^'"]+)['"]|const\s+([A-Za-z0-9_{},\s]+)\s*=\s*require\(['"]([^'"]+)['"]\))''')
        class_regex = re.compile(r'''(?:export\s+)?class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?''')
        func_regex = re.compile(r'''(?:export\s+)?(?:async\s+)?function\s*([A-Za-z0-9_]+)\s*\(([^)]*)\)''')
        arrow_regex = re.compile(r'''(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*(?::\s*[^=]+)?\s*=>''')
        route_regex = re.compile(r'''(?:app|router|server)\.(get|post|put|delete|patch|use)\s*\(\s*['"]([^'"]+)['"]''')

        for idx, line in enumerate(lines, 1):
            line_str = line.strip()

            # Imports
            imp_m = import_regex.search(line_str)
            if imp_m:
                named, star, default_imp, path1, req_vars, path2 = imp_m.groups()
                mod_path = path1 or path2 or ""
                sym_name = (named or star or default_imp or req_vars or mod_path).strip()
                symbols.append(ParsedSymbol(
                    symbol_type='import',
                    name=sym_name,
                    start_line=idx,
                    end_line=idx,
                    signature=line_str,
                    metadata={'module': mod_path}
                ))
                relations.append(ParsedRelation(
                    source_name=file_path,
                    target_name=mod_path,
                    relationship_type='imports'
                ))

            # Classes
            cls_m = class_regex.search(line_str)
            if cls_m:
                cls_name = cls_m.group(1)
                super_cls = cls_m.group(2)
                symbols.append(ParsedSymbol(
                    symbol_type='class',
                    name=cls_name,
                    start_line=idx,
                    end_line=idx + 15,
                    signature=line_str,
                    metadata={'extends': super_cls} if super_cls else {}
                ))
                if super_cls:
                    relations.append(ParsedRelation(
                        source_name=cls_name,
                        target_name=super_cls,
                        relationship_type='inherits'
                    ))

            # Functions
            fn_m = func_regex.search(line_str)
            if fn_m:
                fn_name = fn_m.group(1)
                symbols.append(ParsedSymbol(
                    symbol_type='function',
                    name=fn_name,
                    start_line=idx,
                    end_line=idx + 10,
                    signature=line_str,
                    metadata={'params': fn_m.group(2)}
                ))

            # Arrow Functions
            arrow_m = arrow_regex.search(line_str)
            if arrow_m:
                fn_name = arrow_m.group(1)
                symbols.append(ParsedSymbol(
                    symbol_type='function',
                    name=fn_name,
                    start_line=idx,
                    end_line=idx + 10,
                    signature=line_str,
                    metadata={'params': arrow_m.group(2)}
                ))

            # Route Endpoints
            route_m = route_regex.search(line_str)
            if route_m:
                method = route_m.group(1).upper()
                route_path = route_m.group(2)
                symbols.append(ParsedSymbol(
                    symbol_type='route',
                    name=f"{method} {route_path}",
                    start_line=idx,
                    end_line=idx + 5,
                    signature=line_str,
                    metadata={'method': method, 'path': route_path}
                ))

        return symbols, relations

class JavaParser(BaseParser):
    def parse(self, code: str, file_path: str) -> Tuple[List[ParsedSymbol], List[ParsedRelation]]:
        symbols: List[ParsedSymbol] = []
        relations: List[ParsedRelation] = []
        lines = code.splitlines()

        import_regex = re.compile(r'^import\s+(?:static\s+)?([A-Za-z0-9_.*]+);')
        class_regex = re.compile(r'(?:public|protected|private)?\s*(?:abstract|final)?\s*(class|interface|enum)\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?(?:\s+implements\s+([A-Za-z0-9_,\s]+))?')
        method_regex = re.compile(r'(?:public|protected|private|static|final|\s)+[\w\<\>\[\]]+\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?\s*\{')

        for idx, line in enumerate(lines, 1):
            line_str = line.strip()

            imp_m = import_regex.match(line_str)
            if imp_m:
                pkg = imp_m.group(1)
                symbols.append(ParsedSymbol(
                    symbol_type='import',
                    name=pkg,
                    start_line=idx,
                    end_line=idx,
                    signature=line_str
                ))
                relations.append(ParsedRelation(
                    source_name=file_path,
                    target_name=pkg,
                    relationship_type='imports'
                ))

            cls_m = class_regex.search(line_str)
            if cls_m:
                kind, name, parent, interfaces = cls_m.groups()
                symbols.append(ParsedSymbol(
                    symbol_type='class',
                    name=name,
                    start_line=idx,
                    end_line=idx + 25,
                    signature=line_str,
                    metadata={'kind': kind, 'parent': parent, 'interfaces': interfaces}
                ))
                if parent:
                    relations.append(ParsedRelation(
                        source_name=name,
                        target_name=parent,
                        relationship_type='inherits'
                    ))

            m_m = method_regex.search(line_str)
            if m_m and not cls_regex.search(line_str) and not line_str.startswith('if') and not line_str.startswith('for'):
                m_name = m_m.group(1)
                symbols.append(ParsedSymbol(
                    symbol_type='method',
                    name=m_name,
                    start_line=idx,
                    end_line=idx + 10,
                    signature=line_str,
                    metadata={'params': m_m.group(2)}
                ))

        return symbols, relations

class GenericParser(BaseParser):
    def parse(self, code: str, file_path: str) -> Tuple[List[ParsedSymbol], List[ParsedRelation]]:
        symbols: List[ParsedSymbol] = []
        relations: List[ParsedRelation] = []
        lines = code.splitlines()

        # Extract top-level headings / keys in configs/markdown
        for idx, line in enumerate(lines, 1):
            line_str = line.strip()
            if line_str.startswith('# ') or line_str.startswith('## '):
                symbols.append(ParsedSymbol(
                    symbol_type='variable',
                    name=line_str.lstrip('#').strip(),
                    start_line=idx,
                    end_line=idx,
                    signature=line_str
                ))
            elif re.match(r'^[A-Za-z0-9_-]+:\s*', line_str) and not line_str.startswith('#'):
                key = line_str.split(':', 1)[0].strip()
                symbols.append(ParsedSymbol(
                    symbol_type='variable',
                    name=key,
                    start_line=idx,
                    end_line=idx,
                    signature=line_str
                ))
        return symbols, relations

def get_parser_for_file(file_path: str, language: str) -> BaseParser:
    lang = language.lower()
    ext = file_path.lower().split('.')[-1] if '.' in file_path else ''

    if lang in ('python', 'py') or ext in ('py', 'pyw'):
        return PythonParser()
    elif lang in ('javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx') or ext in ('js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'):
        return JavaScriptTypeScriptParser()
    elif lang in ('java',) or ext in ('java',):
        return JavaParser()
    else:
        return GenericParser()
