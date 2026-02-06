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
   - Do NOT print local file paths, raw URLs, filenames, or download/status labels in user-facing text
   - Keep user-facing text focused on content outcomes; artifact UI handles download controls

## Usage

The agent should call this skill to generate Word documents.

**Correct workflow:**
```
1. Prepare your markdown content
2. Call generate_word_document(content=markdown_text, title="Hygiene Report")
```

This will execute the generator script and emit artifact metadata for the UI card.

## Script Parameters

When calling `generate_word_document`, provide:
- `content`: Your markdown text
- `title`: Document title (optional)

Returns: Metadata for the generated .docx artifact

- Headings (H1-H6)
- Bold and italic text
- Bullet lists and numbered lists
- Paragraphs with spacing
- Basic tables (optional)

See `references/formatting-guide.md` for detailed styling options.
