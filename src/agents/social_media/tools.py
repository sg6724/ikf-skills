"""
Custom tools for the Social Media Agent.
"""

from pathlib import Path
from agno.tools import tool


@tool(
    name="generate_word_document",
    description="Generate a Word (.docx) document from markdown content. Use this after creating a hygiene check report to save it as a Word file.",
    show_result=True
)
def generate_word_document(content: str, output_file: str, title: str = None) -> str:
    """
    Generate a Word document from markdown content.
    
    Args:
        content: The full markdown content to convert to Word
        output_file: Output file path, e.g., "results/hygiene-checks/client-name.docx"
        title: Optional document title
        
    Returns:
        str: Absolute path to the generated Word document
    """
    import importlib.util
    from pathlib import Path
    
    # Get absolute path to generator.py
    current_dir = Path(__file__).resolve().parent
    project_root = current_dir.parent.parent.parent
    generator_path = project_root / "skills" / "general" / "docxmaker" / "scripts" / "generator.py"
    
    # Load the module dynamically
    spec = importlib.util.spec_from_file_location("generator", generator_path)
    generator_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator_module)
    
    try:
        file_path = generator_module.create_docx_from_markdown(
            content=content,
            output_file=output_file,
            title=title
        )
        return f"Document successfully generated at: {file_path}"
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return f"Error generating document: {str(e)}\n{error_details}"
