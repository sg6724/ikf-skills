"""
Markdown File Generator

Saves markdown content to .md files.
Simple, general-purpose utility.
"""

from pathlib import Path
import argparse
import sys


def save_markdown_file(content: str, output_file: str) -> str:
    """
    Save markdown content to a file.
    
    Args:
        content: Markdown formatted string
        output_file: Path where the .md file should be saved
    
    Returns:
        Absolute path to the created file
    """
    output_path = Path(output_file)
    
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write content
    output_path.write_text(content, encoding='utf-8')
    
    return str(output_path.absolute())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Save markdown to file')
    parser.add_argument('--content', type=str, required=True, help='Markdown content')
    parser.add_argument('--output_file', type=str, required=True, help='Output .md file path')
    
    args = parser.parse_args()
    
    try:
        output = save_markdown_file(
            content=args.content,
            output_file=args.output_file
        )
        print(f"Markdown saved: {output}")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
