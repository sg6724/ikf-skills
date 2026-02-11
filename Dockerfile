FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy and install backend dependencies
COPY src/backend/pyproject.toml src/backend/uv.lock ./src/backend/
RUN cd src/backend && uv sync --frozen

# Copy entire repo
COPY . .

EXPOSE 8000

# Set working directory to backend
WORKDIR /app/src/backend

# Use the same command as local
CMD ["uv", "run", "python", "-m", "app.main"]