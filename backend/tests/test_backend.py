import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import User
from projects.models import Project
from repositories.models import RepositoryFile, CodeSymbol
from embeddings.models import CodeChunk
from embeddings.retrieval import VectorRetrievalService
from code_analysis.parsers import PythonParser
from code_analysis.services import ArchitectureGraphService, ImpactAnalysisService
from security_analysis.scanner import SecurityScannerService

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_users(db):
    user_a = User.objects.create_user(
        email='alice@example.com',
        username='alice',
        password='password123',
        name='Alice Engineer',
        role=User.Role.USER
    )
    user_b = User.objects.create_user(
        email='bob@example.com',
        username='bob',
        password='password123',
        name='Bob Engineer',
        role=User.Role.USER
    )
    admin = User.objects.create_user(
        email='admin@example.com',
        username='admin_test',
        password='password123',
        name='Admin Tester',
        role=User.Role.ADMIN
    )
    return {'alice': user_a, 'bob': user_b, 'admin': admin}

@pytest.mark.django_db
class TestAuthentication:
    def test_user_registration(self, api_client):
        res = api_client.post('/api/auth/register/', {
            'email': 'newdev@example.com',
            'username': 'newdev',
            'password': 'StrongPassword123!',
            'password_confirm': 'StrongPassword123!'
        })
        assert res.status_code == 201
        assert res.data['success'] is True
        assert 'tokens' in res.data
        assert res.data['user']['email'] == 'newdev@example.com'

    def test_user_login(self, api_client, test_users):
        res = api_client.post('/api/auth/login/', {
            'email': 'alice@example.com',
            'password': 'password123'
        })
        assert res.status_code == 200
        assert 'tokens' in res.data
        assert 'access' in res.data['tokens']

    def test_login_invalid_password(self, api_client, test_users):
        res = api_client.post('/api/auth/login/', {
            'email': 'alice@example.com',
            'password': 'wrongpassword'
        })
        assert res.status_code == 400

@pytest.mark.django_db
class TestProjectOwnershipIsolation:
    def test_user_cannot_access_other_user_project(self, api_client, test_users):
        # Alice creates a project
        alice_project = Project.objects.create(
            owner=test_users['alice'],
            name="Alice Secret Project"
        )

        # Authenticate as Bob
        api_client.force_authenticate(user=test_users['bob'])

        # Bob attempts to get Alice's project
        res = api_client.get(f'/api/projects/{alice_project.id}/')
        assert res.status_code == 404

        # Bob attempts to list projects: Alice's project must not be included
        list_res = api_client.get('/api/projects/')
        assert list_res.status_code == 200
        project_ids = [p['id'] for p in list_res.data]
        assert str(alice_project.id) not in project_ids

    def test_admin_can_access_any_project(self, api_client, test_users):
        alice_project = Project.objects.create(
            owner=test_users['alice'],
            name="Alice Project"
        )
        api_client.force_authenticate(user=test_users['admin'])
        res = api_client.get(f'/api/projects/{alice_project.id}/')
        assert res.status_code == 200
        assert res.data['name'] == "Alice Project"

@pytest.mark.django_db
class TestCodeAnalysisAndRAG:
    def test_python_ast_parsing(self):
        sample_code = """
import os
from math import sqrt

class Calculator(object):
    '''A math calculator class'''
    def add(self, a, b):
        return a + b

def calculate_hypotenuse(x, y):
    c = Calculator()
    return sqrt(c.add(x*x, y*y))
"""
        parser = PythonParser()
        symbols, relations = parser.parse(sample_code, "math_utils.py")

        sym_names = [s.name for s in symbols]
        assert "Calculator" in sym_names
        assert "add" in sym_names
        assert "calculate_hypotenuse" in sym_names
        assert any(r.relationship_type == 'imports' for r in relations)

    def test_vector_retrieval_project_isolation(self, test_users):
        proj_1 = Project.objects.create(owner=test_users['alice'], name="Project 1")
        proj_2 = Project.objects.create(owner=test_users['bob'], name="Project 2")

        f1 = RepositoryFile.objects.create(project=proj_1, path="auth.py", content="def login_user(): pass")
        f2 = RepositoryFile.objects.create(project=proj_2, path="auth.py", content="def admin_super_secret_login(): pass")

        CodeChunk.objects.create(
            project=proj_1, file=f1, content="def login_user(): pass",
            start_line=1, end_line=1, symbol_name="login_user",
            embedding=[0.1] * 384
        )
        CodeChunk.objects.create(
            project=proj_2, file=f2, content="def admin_super_secret_login(): pass",
            start_line=1, end_line=1, symbol_name="admin_super_secret_login",
            embedding=[0.1] * 384
        )

        # Retrieval for Project 1 must NEVER return Project 2's chunk
        results = VectorRetrievalService.retrieve_relevant_chunks(proj_1, "admin_super_secret_login")
        for chunk in results:
            assert "admin_super_secret_login" not in chunk['content']
            assert chunk['symbol_name'] != "admin_super_secret_login"

    def test_security_scanner(self, test_users):
        proj = Project.objects.create(owner=test_users['alice'], name="Insecure Repo")
        vulnerable_code = """
import os
AWS_KEY = "AKIA1234567890ABCDEF"  # Secret leak
def run_query(user_input):
    query = f"SELECT * FROM users WHERE name = '{user_input}'"
    cursor.execute(query)  # SQL injection
"""
        RepositoryFile.objects.create(
            project=proj,
            path="vulnerable.py",
            content=vulnerable_code
        )

        findings = SecurityScannerService.scan_project(proj)
        assert len(findings) >= 2
        categories = [f.category for f in findings]
        assert 'secret' in categories
        assert 'sqli' in categories
