# CodeLens — AI Software Repository Intelligence System

**CodeLens** is a production-ready repository intelligence layer that allows engineering teams to connect a GitHub repository or upload a ZIP codebase, understand its architecture, query the code using grounded LLM + RAG, generate living documentation, and perform change-impact blast radius and static security analysis.

Unlike generic chatbots, CodeLens is strictly **evidence-based**: every technical explanation cites exact file paths and line numbers that jump directly to interactive views in Monaco Editor.

---

## 1. System Architecture

```
                          ┌────────────────────────┐
                          │   React 18 Frontend    │
                          │   Vite + Monaco Editor │
                          │   Tailwind + Recharts  │
                          └───────────┬────────────┘
                                      │ REST API / JWT
                                      ▼
                          ┌────────────────────────┐
                          │    Django / DRF Core   │
                          │   Auth & Permissions   │
                          └─────┬────────────┬─────┘
                                │            │
                 ┌──────────────┴───┐    ┌───┴──────────────┐
                 │  Code Analyzer   │    │  Ingestion &     │
                 │  AST & Parsers   │    │  Celery Workers  │
                 └──────┬───────────┘    └───┬──────────────┘
                        │                    │
                        ▼                    ▼
     ┌────────────────────────────────────────────────────────┐
     │                   Storage & Retrieval                  │
     │  PostgreSQL (pgvector) / Vector Cosine Similarity      │
     │  Redis Message Broker & Distributed Task Queue         │
     └────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS (neutral dark developer aesthetics)
- **Editor**: `@monaco-editor/react` for high-performance syntax highlighting, line jumping, and citation inspection
- **State & Routing**: TanStack Query & React Router v6
- **Icons**: Lucide Icons
- **Visualizations**: Interactive SVG dependency graph & Recharts analytics

### Backend
- **Framework**: Python 3.11/3.13, Django 5.1, Django REST Framework
- **Authentication**: JWT (`djangorestframework-simplejwt`) with auto-rotation & RBAC
- **Documentation**: OpenAPI 3.0 via `drf-spectacular` (Swagger & ReDoc)
- **Database**: PostgreSQL 16 with `pgvector` extension (with seamless SQLite fallback for local headless testing)
- **Task Queue**: Celery 5.4 with Redis message broker (supports eager mode)
- **Static Files**: WhiteNoise & Gunicorn

### Code Analysis & Semantic RAG
- **AST Parsing**: Python `ast`, JavaScript/TypeScript lexical symbol extraction, Java parser, and generic fallback
- **Entity Extraction**: Functions, classes, decorators, imports, API routes, schemas, and models
- **Chunking**: Symbol-aware semantic chunker bound by function/class boundaries with line numbering
- **Embeddings & AI Abstraction**: Pluggable AI service (`MockLocalProvider`, `OpenAIProvider`, `GeminiProvider`, `AnthropicProvider`)
- **Isolation**: Tenant-isolated vector queries (`project_id=...`) preventing cross-project leakage

---

## 3. Core Capabilities

1. **Repository Ingestion & Safe Unpacking**
   - Safe ZIP extraction protecting against Zip Slip path traversal vulnerabilities.
   - Public GitHub repository cloner (`https://github.com/owner/repo`).
   - Ignores `.git`, `node_modules`, build artifacts, virtualenvs, and binary files.

2. **Interactive Code Explorer (Monaco Editor)**
   - Tree navigation with file search and symbol outlines.
   - Deep-linking via `?file=<path>&line=<number>`.

3. **Code-Aware RAG with Verifiable Citations**
   - Answers questions strictly using retrieved code evidence.
   - Refuses hallucination when code does not contain the answer.
   - Clickable citations jump straight to the source line in Monaco Editor.

4. **Architecture & Module Graph**
   - Visualizes package hierarchy, file-level imports, and function calls.
   - Inspects incoming callers and outgoing dependencies.

5. **Change-Impact Blast Radius Analyzer**
   - Select any file to compute downstream direct and transitive dependents using BFS graph reachability.
   - Generates confidence levels and testing recommendations.

6. **Static Security Vulnerability Audit (SAST)**
   - Scans for hardcoded AWS keys, GitHub tokens, and private keys.
   - Detects dynamic SQL injection formatting.
   - Highlights dangerous functions (`eval`, `exec`, `pickle.loads`).
   - Flags weak cryptography (MD5/SHA1) and insecure auth configurations.

7. **Living Documentation Generator**
   - Generates System Architecture Overview, Setup Guides, API Catalogs, and Day-1 Developer Onboarding Walkthroughs.
   - Supports live editing, copying, and Markdown file export.

8. **Admin Telemetry & Job Monitoring**
   - Live health checks for Database, Redis, and workers.
   - Real-time ingestion job queue monitoring with progress bars and error traces.

---

## 4. Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional) Docker & Docker Compose

### Option A: One-Command Development Script

```bash
# Clone the repository
cd codelens

# Run the dev startup script (sets up virtualenv, installs deps, seeds data, and starts servers)
./scripts/run_dev.sh
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000/api/](http://localhost:8000/api/)
- Swagger API Docs: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)

---

### Option B: Docker Compose

```bash
# Start all containers (PostgreSQL with pgvector, Redis, Celery, Django, and React)
docker compose up --build
```

Access the application at [http://localhost:3000](http://localhost:3000).

---

## 5. Pre-Seeded Demo Accounts

To immediately test the application without manual signup, use:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Developer** | `developer@codelens.dev` | `dev123456` | Manage repositories, chat, explore architecture |
| **Administrator** | `admin@codelens.dev` | `admin123456` | Global telemetry, worker queue monitoring |

Both accounts are pre-configured with a sample payment microservice repository (`PaymentGateway Microservice`) featuring real code, security findings, and dependency graphs.

---

## 6. Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `DJANGO_DEBUG` | `False` | Enables Django debug mode (set to `False` in production) |
| `DJANGO_SECRET_KEY` | - | Cryptographic secret key for session and signature verification |
| `DJANGO_ALLOWED_HOSTS` | `*` | Comma-separated list of allowed hostnames |
| `DATABASE_URL` | - | Connection string for PostgreSQL (e.g. `postgresql://user:pass@host:5432/db`) |
| `REDIS_URL` | `redis://localhost:6379/0` | Connection string for Redis broker |
| `CELERY_ALWAYS_EAGER` | `False` | Run Celery tasks synchronously (useful for local dev without Redis) |
| `AI_PROVIDER` | `mock` | `mock` (offline local engine), `openai`, or `gemini` |
| `OPENAI_API_KEY` | - | Required if `AI_PROVIDER=openai` |
| `GEMINI_API_KEY` | - | Required if `AI_PROVIDER=gemini` |
| `MAX_UPLOAD_SIZE` | `52428800` | Max file upload limit in bytes (50MB) |
| `SEED_DEMO_DATA` | `true` | Auto-seed sample user accounts and demo project |

---

## 7. Automated Testing Suite

Run the full backend test suite:
```bash
cd backend
source ../venv/bin/activate
pytest -v
```

Run the end-to-end integration test (tests all 10 user workflow steps):
```bash
python scripts/test_e2e.py
```

Test frontend build:
```bash
cd frontend
npm run build
```

---

## 8. Production Cloud Deployment (Render & Railway)

### Deploying to Render
1. Create a **New Blueprint Instance** in Render.
2. Connect your Git repository containing CodeLens.
3. Render reads `render.yaml` automatically:
   - Provisions **Managed PostgreSQL** with `pgvector`
   - Provisions **Managed Redis**
   - Deploys **Backend Web Service** (Gunicorn)
   - Deploys **Celery Worker**
   - Deploys **Frontend Static Site**

### Deploying to Railway
1. Create a new Railway project.
2. Add a **PostgreSQL** service and enable `pgvector`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Add a **Redis** service.
4. Deploy the Backend repository, setting `DATABASE_URL` and `REDIS_URL` from the Railway environment.
5. Deploy the Frontend repository pointing `VITE_API_URL` to your backend public URL.

---

## 9. Security & Privacy Guarantees

- **Cross-Tenant Vector Isolation**: Embeddings and chunks are strictly isolated by `project_id`.
- **Path Traversal Defense**: Zip Slip archive attacks are rejected during extraction.
- **Sanitized Citations**: Code snippets are sanitized prior to display in chat.
- **Zero Public Training**: CodeLens does not send user repository code to public model training pipelines.

---

## 10. License
MIT License. Built with precision for engineering teams.
