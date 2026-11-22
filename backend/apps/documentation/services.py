import os
from typing import Dict, Any
from projects.models import Project
from repositories.models import RepositoryFile, CodeSymbol
from .models import GeneratedDocument

class DocumentationGeneratorService:
    @classmethod
    def generate_all_docs(cls, project: Project) -> Dict[str, GeneratedDocument]:
        docs = {}
        docs['overview'] = cls.generate_overview(project)
        docs['installation'] = cls.generate_installation_guide(project)
        docs['api'] = cls.generate_api_docs(project)
        docs['modules'] = cls.generate_modules_docs(project)
        docs['onboarding'] = cls.generate_onboarding_guide(project)
        return docs

    @classmethod
    def generate_overview(cls, project: Project) -> GeneratedDocument:
        files = RepositoryFile.objects.filter(project=project)
        symbols = CodeSymbol.objects.filter(project=project)
        lang_stats = project.languages or {}

        top_langs = sorted(lang_stats.items(), key=lambda x: x[1], reverse=True)
        langs_str = ", ".join([f"{l[0].capitalize()} ({l[1]} files)" for l in top_langs]) if top_langs else "Multiple"

        routes_count = symbols.filter(symbol_type='route').count()
        models_count = symbols.filter(symbol_type='model').count()
        classes_count = symbols.filter(symbol_type='class').count()
        functions_count = symbols.filter(symbol_type='function').count()

        content = f"""# {project.name} — Architecture & System Overview

## 1. Executive Summary
This document provides an automated architectural blueprint for the `{project.name}` codebase.
The repository was analyzed and indexed by **CodeLens Intelligence System**.

- **Repository Source**: {project.get_source_type_display()}
- **Primary Languages**: {langs_str}
- **Total Indexed Files**: {project.file_count}
- **Total Lines of Code**: {project.line_count:,}
- **Detected Components**: {classes_count} classes, {models_count} data models, {routes_count} API endpoints, {functions_count} functions.

---

## 2. Technology Stack & Ecosystem
Based on static file analysis, the codebase employs:
{chr(10).join([f"- **{k.upper()}**: {v} source files" for k, v in top_langs])}

---

## 3. Core Architectural Modules
The system is divided into key directories:
"""
        # Group by top-level directories
        top_dirs = set()
        for f in files:
            parts = f.path.split('/')
            if len(parts) > 1:
                top_dirs.add(parts[0])
            else:
                top_dirs.add('root')

        for d in sorted(top_dirs):
            d_files = [f for f in files if f.path.startswith(d + '/') or (d == 'root' and '/' not in f.path)]
            content += f"- **`{d}/`**: Contains {len(d_files)} files handling core subsystem logic.\n"

        content += f"""
---

## 4. Key Metrics Summary
| Metric | Value |
|---|---|
| Total Source Files | {project.file_count} |
| Total Lines of Code | {project.line_count:,} |
| Total Symbols (AST) | {project.symbol_count} |
| Vector Chunks | {project.chunk_count} |
| Indexing Status | {project.get_status_display()} |
"""

        doc, _ = GeneratedDocument.objects.update_or_create(
            project=project,
            doc_type=GeneratedDocument.DocType.OVERVIEW,
            defaults={'title': f'{project.name} Architecture Overview', 'content': content}
        )
        return doc

    @classmethod
    def generate_installation_guide(cls, project: Project) -> GeneratedDocument:
        files = {f.path: f for f in RepositoryFile.objects.filter(project=project)}
        
        has_python = 'requirements.txt' in files or 'pyproject.toml' in files or any(p.endswith('.py') for p in files)
        has_node = 'package.json' in files or any(p.endswith(('.ts', '.js')) for p in files)
        has_docker = 'Dockerfile' in files or 'docker-compose.yml' in files

        content = f"""# {project.name} — Installation & Setup Guide

This guide describes how to configure, install dependencies, and run `{project.name}` locally.

---

## 1. Prerequisites
Ensure you have the following installed on your machine:
"""
        if has_docker:
            content += "- **Docker & Docker Compose** (Recommended)\n"
        if has_python:
            content += "- **Python 3.10+** and `pip`\n"
        if has_node:
            content += "- **Node.js 18+** and `npm` or `yarn` / `pnpm`\n"

        content += "\n---\n\n## 2. Installation Steps\n\n"

        if has_python:
            content += """### Python Backend Setup
```bash
# 1. Clone repository and navigate to directory
git clone <repository_url>
cd <repository_folder>

# 2. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# 3. Install dependencies
pip install -r requirements.txt
```
\n"""

        if has_node:
            content += """### Node / Frontend Setup
```bash
# 1. Navigate to frontend directory (if applicable)
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
\n"""

        if has_docker:
            content += """### Docker Compose Setup
```bash
# Build and run all services in containers
docker compose up --build
```
\n"""

        content += """---

## 3. Environment Variables Configuration
Create a `.env` file in the project root containing necessary secrets:
```ini
# Core Configuration
DEBUG=True
SECRET_KEY=your-secure-secret-key
DATABASE_URL=postgres://user:password@localhost:5432/dbname
```
"""

        doc, _ = GeneratedDocument.objects.update_or_create(
            project=project,
            doc_type=GeneratedDocument.DocType.INSTALLATION,
            defaults={'title': f'{project.name} Installation Guide', 'content': content}
        )
        return doc

    @classmethod
    def generate_api_docs(cls, project: Project) -> GeneratedDocument:
        routes = CodeSymbol.objects.filter(project=project, symbol_type='route').select_related('file')

        content = f"""# {project.name} — API & Endpoint Documentation

Discovered **{routes.count()}** API routes and endpoints across the repository.

---

## Endpoint Catalog
"""
        if routes.exists():
            content += "| Method & Path / Handler | File Location | Line Number |\n|---|---|---|\n"
            for r in routes:
                content += f"| `{r.name}` | `{r.file.path}` | L{r.start_line} |\n"

            content += "\n\n### Detailed Endpoint Definitions\n"
            for r in routes[:20]:
                content += f"#### `{r.name}`\n"
                content += f"- **File**: `{r.file.path}` (lines {r.start_line}–{r.end_line})\n"
                if r.signature:
                    content += f"- **Signature**: `{r.signature}`\n"
                if r.docstring:
                    content += f"- **Docstring**:\n  > {r.docstring.strip()}\n"
                content += "\n"
        else:
            content += "No HTTP endpoints or route annotations were explicitly detected in the analyzed source files.\n"

        doc, _ = GeneratedDocument.objects.update_or_create(
            project=project,
            doc_type=GeneratedDocument.DocType.API,
            defaults={'title': f'{project.name} API Reference', 'content': content}
        )
        return doc

    @classmethod
    def generate_modules_docs(cls, project: Project) -> GeneratedDocument:
        files = RepositoryFile.objects.filter(project=project)
        modules = {}
        for f in files:
            mod = os.path.dirname(f.path) or 'root'
            modules.setdefault(mod, []).append(f)

        content = f"""# {project.name} — Module & Dependency Reference

The repository is organized into **{len(modules)}** modules:

---
"""
        for mod, mod_files in sorted(modules.items()):
            content += f"## Module: `{mod}`\n"
            content += f"Total Files: {len(mod_files)}\n\n"
            content += "| File | Language | Lines | Size |\n|---|---|---|---|\n"
            for f in mod_files:
                content += f"| `{os.path.basename(f.path)}` | {f.language} | {f.line_count} | {f.size} B |\n"
            content += "\n"

        doc, _ = GeneratedDocument.objects.update_or_create(
            project=project,
            doc_type=GeneratedDocument.DocType.MODULES,
            defaults={'title': f'{project.name} Module Reference', 'content': content}
        )
        return doc

    @classmethod
    def generate_onboarding_guide(cls, project: Project) -> GeneratedDocument:
        content = f"""# {project.name} — Developer Onboarding Walkthrough

Welcome to the team! This guide helps you navigate and understand `{project.name}` on your first day.

---

## Day 1 Checklist
- [ ] Clone repository and verify access
- [ ] Configure local environment variables (`.env`)
- [ ] Boot development environment via Docker or local runtime
- [ ] Explore the interactive dependency graph in CodeLens
- [ ] Run test suite and verify passing state

---

## Repository Map
- **Architecture**: Review the architecture graph in CodeLens to see how modules communicate.
- **Data Models**: Look at the schema definitions in database or model files.
- **Routing**: API requests enter through router files and are dispatched to services.

---

## Getting Help
Use the **CodeLens AI Assistant** tab to ask specific questions about authentication flows, database schema, or how specific functions work. Every answer will point you directly to the relevant file and line numbers.
"""

        doc, _ = GeneratedDocument.objects.update_or_create(
            project=project,
            doc_type=GeneratedDocument.DocType.ONBOARDING,
            defaults={'title': f'{project.name} Developer Onboarding', 'content': content}
        )
        return doc
