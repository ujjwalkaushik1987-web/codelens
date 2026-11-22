# CodeLens Backend Dockerfile
FROM python:3.11-slim

# Prevent Python from writing .pyc and buffer stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create a non-root system user and prepare application directories
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /bin/bash -m appuser && \
    mkdir -p /app/media /app/staticfiles && \
    chown -R appuser:appuser /app

# Copy backend codebase
COPY . /app/
RUN chown -R appuser:appuser /app && chmod +x /app/entrypoint.sh

EXPOSE 8000

# Run container as non-root user to eliminate Celery superuser warning and improve container security
USER appuser

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "codelens.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120"]
