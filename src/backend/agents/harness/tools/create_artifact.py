"""
Artifact creation tool for generating markdown documents.
Creates files in the active request artifact directory.
"""

from pathlib import Path
from datetime import datetime, timezone
import uuid
import re
from agno.tools import tool
from runtime_context import current_artifact_dir, current_artifact_run_id, current_conversation_id


# Fallback output for standalone CLI usage (outside API request context).
TMP_DIR = Path(__file__).resolve().parent.parent / "tmp"


def sanitize_filename(filename: str) -> str:
    """Convert a string to a safe filename."""
    # Remove or replace unsafe characters
    safe = re.sub(r'[^\w\s-]', '', filename.lower())
    safe = re.sub(r'[-\s]+', '-', safe).strip('-')
    return safe[:50]  # Limit length


@tool(
    name="create_artifact",
    description="""Create a markdown document artifact that will be displayed to the user.
Use this when the user asks you to create, generate, or write a document, report, guide, 
plan, strategy, or any structured content.

The artifact will appear in the chat as a separate artifact card.

Important response rule:
- Do not include file names, URLs, or download/status labels in assistant text.
- Keep assistant text focused on the substantive content only.

Examples of when to use:
- "Create a document about X"
- "Write me a guide on Y"
- "Generate a report for Z"
- "Make a plan for..."
- "Draft a strategy..."
""",
    show_result=False
)
def create_artifact(title: str, content: str, artifact_type: str = "document") -> dict:
    """
    Create a markdown artifact that will be displayed in the chat.
    
    Args:
        title: The title of the artifact (e.g., "Web Development Best Practices Guide")
        content: The full markdown content of the artifact
        artifact_type: Type of artifact - "document", "report", "guide", "plan", "code", etc.
        
    Returns:
        dict: Artifact metadata for the chat streaming layer
    """
    output_dir = current_artifact_dir.get() or TMP_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Create filename from title
    base_filename = sanitize_filename(title) or "artifact"
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    unique_suffix = uuid.uuid4().hex[:8]
    run_id = current_artifact_run_id.get()
    suffix = f"-{run_id}" if run_id else ""
    filename = f"{base_filename}{suffix}-{timestamp}-{unique_suffix}.md"
    
    # Build full markdown content with metadata header
    full_content = f"""---
title: {title}
type: {artifact_type}
created: {datetime.now(timezone.utc).isoformat()}
---

{content}
"""
    
    file_path = output_dir / filename
    file_path.write_text(full_content, encoding='utf-8')

    conversation_id = current_conversation_id.get()
    artifact = {
        "filename": filename,
        "type": "md",
        "size_bytes": file_path.stat().st_size,
        "mediaType": "text/markdown",
    }
    if conversation_id:
        artifact["url"] = f"/api/artifacts/{conversation_id}/{filename}"

    return {
        "status": "created",
        "message": f"Created artifact: {title}",
        "artifact": artifact,
    }
