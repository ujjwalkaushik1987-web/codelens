#!/usr/bin/env bash
set -e

echo "=== Initializing CodeLens Service (PID $$) ==="

# Determine if this container is responsible for running migrations
IS_MIGRATION_LEADER=false
if [ "$RUN_MIGRATIONS" = "true" ] || [ "$RUN_MIGRATIONS" = "1" ]; then
    IS_MIGRATION_LEADER=true
elif [ -z "$RUN_MIGRATIONS" ] && [[ "$*" != *"celery"* ]]; then
    IS_MIGRATION_LEADER=true
fi

# 1. Wait for PostgreSQL if configured
if [ -n "$DATABASE_URL" ] || [ "$DB_ENGINE" = "postgresql" ]; then
    echo "Waiting for PostgreSQL database connection..."
    python -c "
import time, os, urllib.parse, psycopg2

url_str = os.getenv('DATABASE_URL')
if url_str:
    url = urllib.parse.urlparse(url_str)
    host, port, user, password, db = url.hostname, url.port or 5432, url.username, url.password, url.path[1:]
else:
    host = os.getenv('POSTGRES_HOST', 'localhost')
    port = os.getenv('POSTGRES_PORT', '5432')
    user = os.getenv('POSTGRES_USER', 'postgres')
    password = os.getenv('POSTGRES_PASSWORD', 'postgres')
    db = os.getenv('POSTGRES_DB', 'codelens')

for attempt in range(40):
    try:
        conn = psycopg2.connect(dbname=db, user=user, password=password, host=host, port=port)
        cur = conn.cursor()
        cur.execute('CREATE EXTENSION IF NOT EXISTS vector;')
        conn.commit()
        conn.close()
        print('PostgreSQL is online and pgvector extension is verified.')
        break
    except Exception as e:
        time.sleep(1)
else:
    print('Warning: PostgreSQL connection timed out, continuing...')
"
fi

# 2. Prevent Migration Race Condition
if [ "$IS_MIGRATION_LEADER" = "true" ]; then
    echo "[Migration Leader] Applying database migrations..."
    python manage.py migrate --noinput

    echo "[Migration Leader] Collecting static assets..."
    python manage.py collectstatic --noinput --clear || true

    if [ "$SEED_DEMO_DATA" = "true" ] || [ "$SEED_DEMO_DATA" = "1" ]; then
        echo "[Migration Leader] Seeding initial demo repository and accounts..."
        if [ -f "/scripts/seed_demo.py" ]; then
            python /scripts/seed_demo.py || true
        elif [ -f "../scripts/seed_demo.py" ]; then
            python ../scripts/seed_demo.py || true
        fi
    fi
else
    echo "[Worker Mode] Skipping migrations to prevent race conditions."
    echo "[Worker Mode] Waiting for migration leader to complete database setup..."
    python -c "
import os, sys, time, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'codelens.settings')
django.setup()
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

for attempt in range(60):
    try:
        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        if len(plan) == 0:
            print('[Worker Mode] All database migrations verified.')
            break
    except Exception:
        pass
    time.sleep(2)
else:
    print('Warning: Migration check timed out, continuing worker startup...')
"
fi

echo "=== Launching Service Command: $@ ==="
exec "$@"
