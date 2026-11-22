#!/usr/bin/env bash
set -e

echo "=== Initializing CodeLens Backend Service ==="

# Wait for PostgreSQL if DATABASE_URL is configured
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

for i in range(30):
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

# Run database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static assets..."
python manage.py collectstatic --noinput --clear || true

# Seed default demo account if requested or not present
if [ "$SEED_DEMO_DATA" = "true" ] || [ "$SEED_DEMO_DATA" = "1" ]; then
    echo "Seeding initial demo repository and accounts..."
    if [ -f "/scripts/seed_demo.py" ]; then
        python /scripts/seed_demo.py || true
    elif [ -f "../scripts/seed_demo.py" ]; then
        python ../scripts/seed_demo.py || true
    fi
fi

echo "=== Starting Service: $@ ==="
exec "$@"
