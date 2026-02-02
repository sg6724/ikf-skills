"""
Artifacts API Route

Serves generated files (DOCX, PDF, XLSX, images) for download.
"""

import mimetypes
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.db.conversations import get_db

router = APIRouter(prefix="/api/artifacts", tags=["artifacts"])

# Artifacts directory
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent.parent / "artifacts"

# Allowed file extensions for security
ALLOWED_EXTENSIONS = {'.docx', '.xlsx', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.csv', '.md', '.txt'}


@router.get("/{conversation_id}/{filename}")
async def get_artifact(conversation_id: str, filename: str):
    """
    Download a generated artifact file.
    
    Args:
        conversation_id: The conversation that owns this artifact
        filename: The artifact filename
        
    Returns:
        The file as a download with proper Content-Disposition header
        
    Security:
        - Validates conversation exists
        - Prevents path traversal attacks
        - Only allows specific file extensions
    """
    db = get_db()
    
    # Validate conversation exists
    if not db.conversation_exists(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Security: Prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Security: Check file extension
    file_ext = Path(filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {file_ext}")
    
    # Build file path
    file_path = ARTIFACTS_DIR / conversation_id / filename
    
    # Check file exists
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Artifact not found")
    
    # Get mime type
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        mime_type = "application/octet-stream"
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/{conversation_id}")
async def list_artifacts(conversation_id: str):
    """
    List all artifacts for a conversation.
    
    Returns a list of artifact metadata (filename, type, size, url).
    """
    db = get_db()
    
    # Validate conversation exists
    if not db.conversation_exists(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get artifacts directory
    conv_artifacts_dir = ARTIFACTS_DIR / conversation_id
    
    if not conv_artifacts_dir.exists():
        return {"artifacts": [], "total": 0}
    
    artifacts = []
    for file_path in conv_artifacts_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in ALLOWED_EXTENSIONS:
            artifacts.append({
                "filename": file_path.name,
                "type": file_path.suffix[1:].lower(),
                "url": f"/api/artifacts/{conversation_id}/{file_path.name}",
                "size_bytes": file_path.stat().st_size
            })
    
    return {"artifacts": artifacts, "total": len(artifacts)}


@router.get("")
async def list_all_artifacts(limit: int = 50):
    """
    List all artifacts across all conversations, sorted by newest first.
    
    Returns a list of artifact metadata with conversation ID.
    """
    if not ARTIFACTS_DIR.exists():
        return {"artifacts": [], "total": 0}
    
    all_artifacts = []
    
    # Iterate through all conversation directories
    for conv_dir in ARTIFACTS_DIR.iterdir():
        if not conv_dir.is_dir() or not conv_dir.name.startswith("conv_"):
            continue
        
        conversation_id = conv_dir.name
        
        for file_path in conv_dir.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in ALLOWED_EXTENSIONS:
                stat = file_path.stat()
                all_artifacts.append({
                    "filename": file_path.name,
                    "type": file_path.suffix[1:].lower(),
                    "url": f"/api/artifacts/{conversation_id}/{file_path.name}",
                    "size_bytes": stat.st_size,
                    "conversation_id": conversation_id,
                    "created_at": stat.st_mtime  # Unix timestamp for sorting
                })
    
    # Sort by creation time (newest first)
    all_artifacts.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Limit results
    all_artifacts = all_artifacts[:limit]
    
    return {"artifacts": all_artifacts, "total": len(all_artifacts)}
