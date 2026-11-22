import re
from typing import List, Dict, Any
from projects.models import Project
from repositories.models import RepositoryFile
from .models import SecurityFinding

RULE_DEFINITIONS = [
    # 1. Hardcoded Secrets
    {
        'pattern': re.compile(r'(?:AKIA[0-9A-Z]{16})'),
        'category': SecurityFinding.Category.SECRET,
        'severity': SecurityFinding.Severity.CRITICAL,
        'title': 'Hardcoded AWS Access Key ID',
        'desc': 'Hardcoded AWS Access Key detected in source code. This exposes cloud resources to unauthorized access.',
        'recom': 'Remove the hardcoded key immediately, revoke it in AWS IAM, and load credentials from environment variables or AWS Secrets Manager.'
    },
    {
        'pattern': re.compile(r'(?:ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{22,})'),
        'category': SecurityFinding.Category.SECRET,
        'severity': SecurityFinding.Severity.CRITICAL,
        'title': 'Hardcoded GitHub Personal Access Token',
        'desc': 'A live GitHub Personal Access Token is exposed in plain text within the repository.',
        'recom': 'Revoke the token in GitHub settings and migrate authentication to GitHub Actions secrets or environment variables.'
    },
    {
        'pattern': re.compile(r'-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----'),
        'category': SecurityFinding.Category.SECRET,
        'severity': SecurityFinding.Severity.CRITICAL,
        'title': 'Exposed Private Cryptographic Key',
        'desc': 'Private SSL/TLS or SSH key found in source code.',
        'recom': 'Never commit private keys to source control. Rotate the keypair and inject keys via secure secrets management.'
    },
    {
        'pattern': re.compile(r'''(?i)(?:api_key|apikey|secret_key|client_secret|jwt_secret|secret|auth_token|token)\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"]'''),
        'category': SecurityFinding.Category.SECRET,
        'severity': SecurityFinding.Severity.HIGH,
        'title': 'Hardcoded API / Secret Key',
        'desc': 'High-entropy secret key or API token assigned directly in source code.',
        'recom': 'Store API keys in environment variables (e.g. process.env or os.environ) and add configuration files to .gitignore.'
    },

    # 2. SQL Injection
    {
        'pattern': re.compile(r'''(?:cursor\.execute|raw|db\.query)\s*\(\s*(?:f['"]|['"].*?%\s*\(|['"].*?\+\s*[a-zA-Z_])|(?:query|sql|stmt)\s*=\s*f['"].*?(?:select|insert|update|delete|drop|where)''', re.IGNORECASE),
        'category': SecurityFinding.Category.SQLI,
        'severity': SecurityFinding.Severity.HIGH,
        'title': 'Potential SQL Injection via Dynamic Query Construction',
        'desc': 'SQL query constructed via string formatting or concatenation rather than parameterized query bindings.',
        'recom': 'Use parameterized queries or ORM querysets: e.g. cursor.execute("SELECT * FROM users WHERE id = %s", [user_id]).'
    },

    # 3. Dangerous Functions & Insecure Deserialization
    {
        'pattern': re.compile(r'''\b(?:eval|exec)\s*\('''.strip()),
        'category': SecurityFinding.Category.DEPENDENCIES,
        'severity': SecurityFinding.Severity.HIGH,
        'title': 'Dangerous Execution of Arbitrary Code (eval/exec)',
        'desc': 'Dynamic code evaluation via eval() or exec() can allow Remote Code Execution (RCE) if user input is passed.',
        'recom': 'Refactor to eliminate dynamic code evaluation. Use safe parsers (e.g., ast.literal_eval or JSON parsers).'
    },
    {
        'pattern': re.compile(r'pickle\.loads?\s*\('),
        'category': SecurityFinding.Category.DEPENDENCIES,
        'severity': SecurityFinding.Severity.HIGH,
        'title': 'Insecure Deserialization (pickle)',
        'desc': 'Python pickle deserializes arbitrary Python objects and can execute arbitrary payload code.',
        'recom': 'Use safe serialization formats like JSON, Protocol Buffers, or messagepack.'
    },
    {
        'pattern': re.compile(r'yaml\.load\s*\([^,)]+\)(?!\s*,\s*Loader\s*=\s*yaml\.SafeLoader)'),
        'category': SecurityFinding.Category.DEPENDENCIES,
        'severity': SecurityFinding.Severity.MEDIUM,
        'title': 'Insecure PyYAML load() without SafeLoader',
        'desc': 'Default yaml.load() is vulnerable to arbitrary object instantiation.',
        'recom': 'Use yaml.safe_load(data) or specify Loader=yaml.SafeLoader.'
    },

    # 4. Insecure Authentication / Cryptography
    {
        'pattern': re.compile(r'hashlib\.(?:md5|sha1)\s*\('),
        'category': SecurityFinding.Category.AUTH,
        'severity': SecurityFinding.Severity.MEDIUM,
        'title': 'Weak Cryptographic Hash Function (MD5/SHA1)',
        'desc': 'MD5 and SHA-1 have known collision vulnerabilities and should not be used for security-sensitive hashing or passwords.',
        'recom': 'Use bcrypt, argon2, or SHA-256 (hashlib.sha256) for integrity and argon2/bcrypt for passwords.'
    },
    {
        'pattern': re.compile(r'''jwt\.decode\s*\([^)]*algorithms\s*=\s*\[['"]none['"]\]'''),
        'category': SecurityFinding.Category.AUTH,
        'severity': SecurityFinding.Severity.CRITICAL,
        'title': 'JWT Decoded with "none" Algorithm',
        'desc': 'JWT signature verification is disabled by accepting the "none" algorithm.',
        'recom': 'Enforce cryptographic signature algorithms such as HS256 or RS256 and reject unsigned tokens.'
    },

    # 5. Unsafe Permissions / Configuration
    {
        'pattern': re.compile(r'DEBUG\s*=\s*True'),
        'category': SecurityFinding.Category.PERMISSIONS,
        'severity': SecurityFinding.Severity.MEDIUM,
        'title': 'Django DEBUG Mode Set to True',
        'desc': 'Running with DEBUG=True in production exposes detailed stack traces, internal paths, and environment settings to visitors.',
        'recom': 'Configure DEBUG to read from environment variables: os.getenv("DJANGO_DEBUG", "False").lower() == "true".'
    },
    {
        'pattern': re.compile(r'chmod\s+777'),
        'category': SecurityFinding.Category.PERMISSIONS,
        'severity': SecurityFinding.Severity.MEDIUM,
        'title': 'Overly Permissive File Permissions (777)',
        'desc': 'Granting read, write, and execute permissions to all users allows local privilege escalation or tampering.',
        'recom': 'Restrict permissions to the minimum necessary: e.g. 750 or 640.'
    },

    # 6. Missing Input Validation / XSS
    {
        'pattern': re.compile(r'dangerouslySetInnerHTML\s*=\s*\{\s*__html\s*:'),
        'category': SecurityFinding.Category.VALIDATION,
        'severity': SecurityFinding.Severity.MEDIUM,
        'title': 'Unsanitized HTML Rendering (dangerouslySetInnerHTML)',
        'desc': 'Rendering raw HTML can expose users to Cross-Site Scripting (XSS) if user input is included.',
        'recom': 'Sanitize HTML with DOMPurify before rendering or use standard React text nodes.'
    },
]

class SecurityScannerService:
    @staticmethod
    def scan_project(project: Project) -> List[SecurityFinding]:
        """
        Executes static application security testing (SAST) across all project files.
        Extracts line numbers, code snippets, severity, category, and remediation guides.
        """
        # Clear existing findings for clean re-scan
        SecurityFinding.objects.filter(project=project).delete()

        files = RepositoryFile.objects.filter(project=project)
        new_findings = []

        for repo_file in files:
            content = repo_file.content or ""
            lines = content.splitlines()

            for rule in RULE_DEFINITIONS:
                for idx, line in enumerate(lines, 1):
                    match = rule['pattern'].search(line)
                    if match:
                        snippet_start = max(0, idx - 2)
                        snippet_end = min(len(lines), idx + 2)
                        code_snip = "\n".join(lines[snippet_start:snippet_end])

                        finding = SecurityFinding(
                            project=project,
                            file=repo_file,
                            severity=rule['severity'],
                            category=rule['category'],
                            title=rule['title'],
                            description=rule['desc'],
                            start_line=idx,
                            end_line=idx,
                            code_snippet=code_snip,
                            recommendation=rule['recom'],
                            confidence='high'
                        )
                        new_findings.append(finding)

        created = SecurityFinding.objects.bulk_create(new_findings)
        return created
