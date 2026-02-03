"""
Artifact creation tool for generating markdown documents.
Creates files in the tmp directory that get picked up by chat.py and sent to frontend.
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
    name="create_artifact",
    description="""Create a markdown document artifact that will be displayed to the user.
Use this when the user asks you to create, generate, or write a document, report, guide, 
plan, strategy, or any structured content.

The artifact will appear in the chat and can be viewed/downloaded by the user.

Examples of when to use:
- "Create a document about X"
- "Write me a guide on Y"
- "Generate a report for Z"
- "Make a plan for..."
- "Draft a strategy..."
""",
    show_result=True
)
def create_artifact(title: str, content: str, artifact_type: str = "document") -> str:
    """
    Create a markdown artifact that will be displayed in the chat.
    
    Args:
        title: The title of the artifact (e.g., "Web Development Best Practices Guide")
        content: The full markdown content of the artifact
        artifact_type: Type of artifact - "document", "report", "guide", "plan", "code", etc.
        
    Returns:
        str: Confirmation message with artifact details
    """
    # Ensure tmp directory exists
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    
    # Create filename from title
    base_filename = sanitize_filename(title) or "artifact"
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    filename = f"{base_filename}-{timestamp}.md"
    
    # Build full markdown content with metadata header
    full_content = f"""---
title: {title}
type: {artifact_type}
created: {datetime.now().isoformat()}
---

{content}
"""
    
    # Write to tmp directory
    file_path = TMP_DIR / filename
    file_path.write_text(full_content, encoding='utf-8')
    
    return f"✅ Created artifact: **{title}**\n\nThe document has been generated and is available for viewing."
