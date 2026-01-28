"""
IKF AI Backend - Production FastAPI Application

Clean, minimal API for ChatGPT-like experience in social media/marketing domain.

Endpoints:
- POST /api/chat          - Streaming chat with SSE
- GET  /api/conversations - List conversations
- GET  /api/conversations/{id} - Get conversation
- DELETE /api/conversations/{id} - Delete conversation
- GET  /api/artifacts/{conv_id}/{filename} - Download artifact
- POST /api/export        - Export markdown to DOCX/PDF/XLSX
- GET  /health            - Health check
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path

from app.config import settings
from app.api.routes import chat, conversations, artifacts, export


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for the application"""
    # Startup
    print(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    print(f"📍 Running on http://{settings.host}:{settings.port}")
    print(f"📚 API Docs: http://localhost:{settings.port}/docs")
    
    # Ensure required directories exist
    Path("tmp").mkdir(exist_ok=True)
    Path("artifacts").mkdir(exist_ok=True)
    
    yield
    
    # Shutdown
    print("👋 Shutting down gracefully")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
IKF AI Backend - Production API for social media and marketing AI assistant.

## Features
- **Streaming Chat**: Real-time SSE streaming with thinking steps and tool calls
- **Conversations**: Session-based conversation storage with history
- **Artifacts**: Generated documents accessible via download links
- **Export**: Convert markdown to DOCX, PDF, or XLSX

## Quick Start
1. Send a message: `POST /api/chat` with `{"message": "...", "conversation_id": null}`
2. Receive SSE stream with thinking, content, and artifact events
3. List history: `GET /api/conversations`
4. Export content: `POST /api/export` with `{"content": "...", "format": "docx"}`
    """,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router)
app.include_router(conversations.router)
app.include_router(artifacts.router)
app.include_router(export.router)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version
    }


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "message": "IKF AI Backend",
        "version": settings.app_version,
        "docs": "/docs",
        "endpoints": {
            "chat": "POST /api/chat",
            "conversations": "GET /api/conversations",
            "artifacts": "GET /api/artifacts/{conversation_id}/{filename}",
            "export": "POST /api/export",
            "health": "GET /health"
        }
    }


if __name__ == "__main__":
    """
    Run the application.
    
    Usage:
        uv run python -m app.main
    
    Or with uvicorn directly:
        uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    """
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
