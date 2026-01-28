---
name: docxmaker
description: Generate professional Word (.docx) documents from markdown content. Available to all agents for document export.
---

# Document Generation (docxmaker)

Use this skill to convert markdown content into properly formatted Word documents (.docx).

## Process

1. **Prepare Content**
   - Ensure content is in clean markdown format
   - Use standard markdown syntax (headers, lists, bold, italic)
   - Structure content with clear hierarchy

2. **Generate Document**
   - Call the document generation function with:
     - Markdown content
     - Output filename
     - Optional: styling preferences
   - See `references/formatting-guide.md` for styling options

3. **Save and Deliver**
   - Documents are saved to `results/` directory
   - Organized by subdirectories (e.g., `results/hygiene-checks/`)
   - Returns the full path to the generated file

## Usage

The agent should call this skill to generate Word documents.

**Correct workflow:**
```
1. Prepare your markdown content
2. Call get_skill_script("docxmaker", "scripts/generator.py", execute=True, 
                         arguments={"content": markdown_text, 
                                   "output_file": "results/hygiene-checks/client.docx",
                                   "title": "Hygiene Report"})
```

This will execute the generator script and return the file path.

## Script Parameters

When calling `get_skill_script`, provide:
- `content`: Your markdown text
- `output_file`: Full path like "results/hygiene-checks/[client]-report.docx"
- `title`: Document title (optional)

Returns: Absolute path to generated .docx file

- Headings (H1-H6)
- Bold and italic text
- Bullet lists and numbered lists
- Paragraphs with spacing
- Basic tables (optional)

See `references/formatting-guide.md` for detailed styling options.
