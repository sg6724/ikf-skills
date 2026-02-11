FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy backend dependencies
COPY src/backend/pyproject.toml src/backend/uv.lock ./src/backend/

# Install dependencies using WORKDIR instead of cd
WORKDIR /src/backend/app
RUN uv sync --frozen

# Go back to /app and copy entire repo
WORKDIR /
COPY . .

EXPOSE 8000

# Set working directory to backend for running the app
WORKDIR /src/backend/app

# Use the same command as local
CMD ["uv", "run", "python", "-m", "app.main"]