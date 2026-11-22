import os
import sys
import time
import zipfile
import tempfile
import io
from pathlib import Path

# Setup Django test client environment
BASE_DIR = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / 'apps'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'codelens.settings')

import django
django.setup()

from rest_framework.test import APIClient
from accounts.models import User
from projects.models import Project

def run_e2e_test():
    print("=" * 60)
    print("Starting CodeLens End-to-End System Integration Test")
    print("=" * 60)

    client = APIClient()

    # Step 1: User Registration
    print("\n[Step 1] Registering E2E Developer Account...")
    ts = int(time.time())
    reg_res = client.post('/api/auth/register/', {
        'email': f'e2e_dev_{ts}@codelens.dev',
        'username': f'e2e_dev_{ts}',
        'name': 'E2E Developer',
        'password': 'StrongPassword123!',
        'password_confirm': 'StrongPassword123!'
    })
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.data}"
    tokens = reg_res.data['tokens']
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    print("✓ Successfully registered and authenticated E2E user.")

    # Step 2: Create Project
    print("\n[Step 2] Creating New Repository Project...")
    proj_res = client.post('/api/projects/', {
        'name': 'E2E Payment Microservice',
        'description': 'Integration testing codebase for CodeLens RAG system'
    })
    assert proj_res.status_code == 201, f"Project creation failed: {proj_res.data}"
    project_id = proj_res.data['id']
    print(f"✓ Created Project ID: {project_id}")

    # Step 3: Build and Upload Codebase ZIP
    print("\n[Step 3] Uploading Codebase ZIP Archive...")
    from django.core.files.uploadedfile import SimpleUploadedFile
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zf:
        zf.writestr('app/main.py', """from app.auth import verify_token
from app.db import execute_user_query

def handle_request(auth_token, user_query):
    user = verify_token(auth_token)
    return execute_user_query(user, user_query)
""")
        zf.writestr('app/auth.py', """import jwt
JWT_SECRET = "production-secret-token-key-12345"  # Leaked secret

def verify_token(token):
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
""")
        zf.writestr('app/db.py', """class Database:
    def execute_user_query(self, user, query_str):
        # SQL Injection vulnerability
        sql = f"SELECT * FROM accounts WHERE owner = '{query_str}'"
        return sql
""")

    zip_file = SimpleUploadedFile('codebase.zip', zip_buffer.getvalue(), content_type='application/zip')
    upload_res = client.post(
        f'/api/projects/{project_id}/upload/',
        {'file': zip_file},
        format='multipart'
    )
    assert upload_res.status_code == 202, f"Upload failed: {upload_res.data}"
    print("✓ Archive uploaded. Background indexing completed.")

    # Step 4: Verify Project Status & Extracted Code Elements
    print("\n[Step 4] Verifying Indexing Statistics...")
    status_res = client.get(f'/api/projects/{project_id}/status/')
    assert status_res.status_code == 200
    assert status_res.data['status'] == 'ready', f"Project status is {status_res.data['status']}"
    assert status_res.data['file_count'] == 3, f"Expected 3 files, got {status_res.data['file_count']}"
    assert status_res.data['symbol_count'] >= 3, f"Expected >= 3 symbols, got {status_res.data['symbol_count']}"
    print(f"✓ Status: READY | Files: {status_res.data['file_count']} | Symbols: {status_res.data['symbol_count']} | Chunks: {status_res.data['chunk_count']}")

    # Step 5: Test Architecture Graph
    print("\n[Step 5] Checking Architecture Graph...")
    arch_res = client.get(f'/api/projects/{project_id}/architecture/')
    assert arch_res.status_code == 200
    assert len(arch_res.data['nodes']) >= 3
    print(f"✓ Architecture Graph: {len(arch_res.data['nodes'])} nodes, {len(arch_res.data['edges'])} edges")

    # Step 6: Test Change-Impact Blast Radius
    print("\n[Step 6] Running Change-Impact Blast Radius on 'app/auth.py'...")
    impact_res = client.post(f'/api/projects/{project_id}/impact-analysis/', {
        'file_path': 'app/auth.py'
    })
    assert impact_res.status_code == 200
    assert impact_res.data['direct_impact_count'] >= 1
    print(f"✓ Blast Radius: {impact_res.data['direct_impact_count']} direct dependent(s), {impact_res.data['total_affected']} total affected")

    # Step 7: Test Static Security Analysis Scan
    print("\n[Step 7] Running SAST Security Audit...")
    sec_res = client.post(f'/api/projects/{project_id}/security-scan/')
    assert sec_res.status_code == 200
    findings = sec_res.data['findings']
    assert len(findings) >= 2, f"Expected security findings, got {len(findings)}"
    categories = [f['category'] for f in findings]
    assert 'secret' in categories
    assert 'sqli' in categories
    print(f"✓ Security Scanner: Detected {len(findings)} vulnerability finding(s) with line citations")

    # Step 8: Test Documentation Generation
    print("\n[Step 8] Generating Living Documentation...")
    doc_res = client.post(f'/api/projects/{project_id}/documentation/')
    assert doc_res.status_code == 200
    assert len(doc_res.data['documents']) >= 5
    print(f"✓ Documentation: Generated {len(doc_res.data['documents'])} markdown guides (Overview, Setup, API, Modules, Onboarding)")

    # Step 9: Test AI Grounded RAG Chat with Line Citations
    print("\n[Step 9] Asking AI Assistant with Code-Aware RAG...")
    conv_res = client.post(f'/api/projects/{project_id}/conversations/', {
        'title': 'E2E Test Auth Inquiry'
    })
    assert conv_res.status_code == 201
    conv_id = conv_res.data['id']

    msg_res = client.post(f'/api/conversations/{conv_id}/messages/', {
        'content': 'How does user token verification work in this codebase?'
    })
    assert msg_res.status_code == 201
    assistant_msg = msg_res.data['message']
    citations = msg_res.data['citations']
    assert len(citations) > 0, "AI response must include citations!"
    citation_files = [c['file'] for c in citations]
    assert any('auth.py' in f or 'main.py' in f for f in citation_files), f"Expected citation to auth or main, got {citation_files}"
    print(f"✓ AI Response generated with {len(citations)} source citations:")
    for c in citations[:2]:
        print(f"   -> [{c['file']}:L{c['start_line']}-L{c['end_line']}] ({c['symbol']})")

    # Step 10: Strict Tenant Isolation Check
    print("\n[Step 10] Testing Project Ownership Isolation...")
    hacker_client = APIClient()
    hacker_reg = hacker_client.post('/api/auth/register/', {
        'email': f'hacker_{ts}@example.com',
        'username': f'hacker_{ts}',
        'password': 'HackerPassword123!',
        'password_confirm': 'HackerPassword123!'
    })
    hacker_client.credentials(HTTP_AUTHORIZATION=f"Bearer {hacker_reg.data['tokens']['access']}")
    
    # Hacker attempts to read E2E Developer's project
    hacker_attempt = hacker_client.get(f'/api/projects/{project_id}/')
    assert hacker_attempt.status_code == 404, "Security violation: Hacker accessed another user's project!"
    print("✓ Strict Tenant Isolation: Cross-project access correctly blocked (404 Not Found).")

    print("\n" + "=" * 60)
    print("ALL 10 END-TO-END WORKFLOW INTEGRATION STEPS PASSED!")
    print("=" * 60)

if __name__ == '__main__':
    run_e2e_test()
