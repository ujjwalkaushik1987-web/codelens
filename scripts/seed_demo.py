import os
import sys
import zipfile
import tempfile
from pathlib import Path

# Setup Django environment
BASE_DIR = Path(__file__).resolve().parent.parent / 'backend'
if not BASE_DIR.exists():
    if Path('/app').exists():
        BASE_DIR = Path('/app')
    elif Path('.').resolve().name == 'backend':
        BASE_DIR = Path('.').resolve()
    else:
        BASE_DIR = Path(__file__).resolve().parent

sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / 'apps'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'codelens.settings')

import django
django.setup()

from accounts.models import User
from projects.models import Project
from ingestion.models import AnalysisJob
from ingestion.services import IngestionService
from security_analysis.scanner import SecurityScannerService
from documentation.services import DocumentationGeneratorService

def create_sample_repo_zip() -> str:
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
    
    sample_files = {
        'README.md': """# PaymentGateway API Microservice

A high-performance transaction processing and wallet management microservice.

## Architecture
- `server.py`: API Entry point and route handlers
- `auth/jwt_service.py`: Authentication tokens and session verification
- `models/account.py`: Account and Ledger models
- `services/payment_engine.py`: Core payment transaction routing and settlement
- `config/settings.py`: Application configuration
""",
        'requirements.txt': """fastapi>=0.104.0
uvicorn>=0.24.0
pydantic>=2.4.0
pyjwt>=2.8.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.9
redis>=5.0.0
""",
        'config/settings.py': """import os

DEBUG = True  # Warning: Insecure in production!
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/payments")
JWT_SECRET = "super-secret-production-signing-key-12345678" # Potential secret leak
ALLOWED_ORIGINS = ["*"]
""",
        'models/account.py': """from dataclasses import dataclass
from typing import Optional

class Account:
    def __init__(self, account_id: str, owner_name: str, balance: float):
        self.account_id = account_id
        self.owner_name = owner_name
        self.balance = balance

    def deposit(self, amount: float) -> float:
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")
        self.balance += amount
        return self.balance

    def withdraw(self, amount: float) -> float:
        if amount > self.balance:
            raise ValueError("Insufficient balance")
        self.balance -= amount
        return self.balance

class Transaction:
    def __init__(self, tx_id: str, from_acc: str, to_acc: str, amount: float, status: str = 'pending'):
        self.tx_id = tx_id
        self.from_acc = from_acc
        self.to_acc = to_acc
        self.amount = amount
        self.status = status
""",
        'auth/jwt_service.py': """import jwt
import hashlib
from config.settings import JWT_SECRET

class AuthService:
    @staticmethod
    def generate_token(user_id: str) -> str:
        payload = {"sub": user_id, "role": "merchant"}
        return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    @staticmethod
    def verify_token(token: str) -> dict:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])

    @staticmethod
    def hash_legacy_password(password: str) -> str:
        # Warning: Insecure legacy MD5 hashing
        return hashlib.md5(password.encode('utf-8')).hexdigest()
""",
        'services/payment_engine.py': """from models.account import Account, Transaction
from auth.jwt_service import AuthService

class PaymentEngineService:
    def __init__(self):
        self.ledger = {}

    def process_transfer(self, sender: Account, recipient: Account, amount: float) -> Transaction:
        sender.withdraw(amount)
        recipient.deposit(amount)
        tx = Transaction(
            tx_id=f"tx_{len(self.ledger) + 1}",
            from_acc=sender.account_id,
            to_acc=recipient.account_id,
            amount=amount,
            status='settled'
        )
        self.ledger[tx.tx_id] = tx
        return tx

    def execute_raw_audit_query(self, db_cursor, user_search_input: str):
        # Potential SQL injection vulnerability:
        query = f"SELECT * FROM transactions WHERE from_acc = '{user_search_input}'"
        db_cursor.execute(query)
        return db_cursor.fetchall()
""",
        'server.py': """from services.payment_engine import PaymentEngineService
from auth.jwt_service import AuthService
from models.account import Account

engine = PaymentEngineService()
accounts_db = {
    "acc_001": Account("acc_001", "Acme Corp", 50000.0),
    "acc_002": Account("acc_002", "Beta LLC", 12500.0),
}

def handle_transfer_request(sender_id: str, recipient_id: str, amount: float, auth_token: str):
    user_claims = AuthService.verify_token(auth_token)
    sender = accounts_db.get(sender_id)
    recipient = accounts_db.get(recipient_id)
    if not sender or not recipient:
        raise ValueError("Account not found")
    return engine.process_transfer(sender, recipient, amount)
"""
    }

    with zipfile.ZipFile(temp_zip.name, 'w') as zf:
        for file_path, content in sample_files.items():
            zf.writestr(file_path, content)

    return temp_zip.name

def run_seed():
    print("--- Starting CodeLens Database Seeding ---")

    # 1. Create Admin
    admin_user, created = User.objects.get_or_create(
        email='admin@codelens.dev',
        defaults={
            'username': 'admin',
            'name': 'System Administrator',
            'role': User.Role.ADMIN,
            'is_staff': True,
            'is_superuser': True
        }
    )
    admin_user.set_password('admin123456')
    admin_user.save()
    print(f"Admin User: {admin_user.email} (password: admin123456)")

    # 2. Create Standard User
    dev_user, created = User.objects.get_or_create(
        email='developer@codelens.dev',
        defaults={
            'username': 'developer',
            'name': 'Alex Developer',
            'role': User.Role.USER
        }
    )
    dev_user.set_password('dev123456')
    dev_user.save()
    print(f"Developer User: {dev_user.email} (password: dev123456)")

    # 3. Create Sample Project
    project, created = Project.objects.get_or_create(
        owner=dev_user,
        name='PaymentGateway Microservice',
        defaults={
            'description': 'Core financial transactions and payment settlement processing engine with JWT auth.',
            'source_type': Project.SourceType.ZIP,
            'status': Project.Status.PENDING
        }
    )

    if not created and project.files.exists():
        print(f"Demo project '{project.name}' already seeded and indexed.")
        print("--- Seeding Complete ---")
        return

    zip_path = create_sample_repo_zip()
    job = AnalysisJob.objects.create(
        project=project,
        job_type=AnalysisJob.JobType.INDEXING,
        status=AnalysisJob.Status.RUNNING,
        stage_message="Ingesting demo repository..."
    )

    print("Indexing demo repository...")
    IngestionService.process_zip_archive(project, zip_path, job)

    print("Running initial security scan & generating documentation...")
    SecurityScannerService.scan_project(project)
    DocumentationGeneratorService.generate_all_docs(project)

    if os.path.exists(zip_path):
        os.remove(zip_path)

    print(f"Successfully seeded demo project '{project.name}' (ID: {project.id})")
    print(f"Files: {project.file_count}, Symbols: {project.symbol_count}, Chunks: {project.chunk_count}, Findings: {project.security_findings.count()}")
    print("--- Seeding Complete ---")

if __name__ == '__main__':
    run_seed()
