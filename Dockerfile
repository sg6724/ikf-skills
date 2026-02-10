# Backend container (FastAPI) built from repo root.
# We copy the entire repo because the backend reads skills/artifacts from repo-root paths.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install uv (used by this repo for dependency management)
RUN pip install --no-cache-dir uv

# Install backend deps first for better layer caching.
COPY src/backend/pyproject.toml src/backend/uv.lock /app/src/backend/
WORKDIR /app/src/backend
RUN uv sync --frozen

# Copy the full repo (skills/, artifacts/, frontend/, etc.)
WORKDIR /app
COPY . /app

# Default port; most PaaS will inject PORT and override at runtime.
EXPOSE 8000

CMD ["sh", "-c", "cd /app/src/backend && uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

