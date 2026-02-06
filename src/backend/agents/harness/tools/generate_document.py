"""
Document generation tools.
"""

from pathlib import Path
from datetime import datetime, timezone
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
    name="generate_word_document",
    description="""Generate a Word (.docx) document from markdown content. 
Use this when the user explicitly asks for a Word document or .docx file.
The document will be displayed in the chat as an artifact card.

Note: For preview purposes, prefer create_artifact (markdown) first, 
then let users export to DOCX via the UI.

Important response rule:
- Do not include file names, URLs, or download labels in assistant text.
- Return only substantive analysis/content in prose.""",
    show_result=False
)
def generate_word_document(content: str, title: str = None) -> dict:
    """
    Generate a Word document from markdown content.
    
    Args:
        content: The full markdown content to convert to Word
        title: Document title (used for filename and header)
        
    Returns:
        dict: Artifact metadata for the chat streaming layer
    """
    import importlib.util
    
    output_dir = current_artifact_dir.get() or TMP_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filename from title
    base_filename = sanitize_filename(title) if title else "document"
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    run_id = current_artifact_run_id.get()
    suffix = f"-{run_id}" if run_id else ""
    filename = f"{base_filename}{suffix}-{timestamp}.docx"
    output_path = output_dir / filename
    
    # Find and load the generator module
    current_dir = Path(__file__).resolve().parent
    project_root = current_dir.parent.parent.parent.parent.parent
    generator_path = project_root / "skills" / "general" / "docxmaker" / "scripts" / "generator.py"
    
    if not generator_path.exists():
        return {
            "status": "error",
            "message": f"Document generator not found at {generator_path}",
        }
    
    spec = importlib.util.spec_from_file_location("generator", generator_path)
    generator_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator_module)
    
    try:
        generator_module.create_docx_from_markdown(
            content=content,
            output_file=str(output_path),
            title=title
        )
        conversation_id = current_conversation_id.get()
        artifact = {
            "filename": filename,
            "type": "docx",
            "size_bytes": output_path.stat().st_size,
            "mediaType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        if conversation_id:
            artifact["url"] = f"/api/artifacts/{conversation_id}/{filename}"
        return {
            "status": "created",
            "message": f"Created Word document: {title or 'Document'}",
            "artifact": artifact,
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error generating document: {str(e)}",
        }
