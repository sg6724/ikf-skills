"""
Document generation tools.

IMPORTANT: All generated documents are written to the tmp/ directory
so that chat.py can detect and serve them as artifacts.
"""

from pathlib import Path
from datetime import datetime
import re
from agno.tools import tool


# Directory where artifacts are temporarily stored before being moved to conversation artifacts
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
The document will be displayed in the chat as an artifact that users can download.

Note: For preview purposes, prefer create_artifact (markdown) first, 
then let users export to DOCX via the UI.""",
    show_result=True
)
def generate_word_document(content: str, title: str = None) -> str:
    """
    Generate a Word document from markdown content.
    
    Args:
        content: The full markdown content to convert to Word
        title: Document title (used for filename and header)
        
    Returns:
        str: Confirmation message about the generated document
    """
    import importlib.util
    
    # Ensure tmp directory exists
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    
    # Generate filename from title
    base_filename = sanitize_filename(title) if title else "document"
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    filename = f"{base_filename}-{timestamp}.docx"
    output_path = TMP_DIR / filename
    
    # Find and load the generator module
    current_dir = Path(__file__).resolve().parent
    project_root = current_dir.parent.parent.parent.parent.parent
    generator_path = project_root / "skills" / "general" / "docxmaker" / "scripts" / "generator.py"
    
    if not generator_path.exists():
        return f"Error: Document generator not found at {generator_path}"
    
    spec = importlib.util.spec_from_file_location("generator", generator_path)
    generator_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator_module)
    
    try:
        file_path = generator_module.create_docx_from_markdown(
            content=content,
            output_file=str(output_path),
            title=title
        )
        return f"Created Word document: **{title or 'Document'}**\n\nThe document is available for download in the chat."
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return f"Error generating document: {str(e)}\n{error_details}"
