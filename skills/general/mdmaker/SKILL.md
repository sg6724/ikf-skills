---
name: mdmaker
description: Save markdown content to .md files. Available to all agents for markdown file export.
---

# Markdown File Generator (mdmaker)

Use this skill to save markdown content as `.md` files.

## Process

1. **Prepare Content**
   - Ensure content is in clean markdown format
   - Use standard markdown syntax (headers, lists, bold, italic, links)
   - Structure content with clear hierarchy

2. **Generate File**
   - Call the generation tool with:
     - Markdown content
     - Output filename
   - See `references/formatting-guide.md` for markdown best practices

3. **Save and Deliver**
   - Files are saved to specified path
   - Returns the full path to the generated file

## Usage

The agent should call this skill to save markdown files.

**Correct workflow:**
```
1. Prepare your markdown content
2. Call generate_markdown_file(content=markdown_text, 
                               output_file="results/report.md")
```

This will save the markdown and return the file path.

## Script Parameters

When calling the tool, provide:
- `content`: Your markdown text
- `output_file`: Full path like "results/[name].md"

Returns: Absolute path to generated .md file

## Supported Markdown

- Headings (H1-H6)
- Bold and italic text
- Bullet lists and numbered lists
- Clickable links `[text](url)`
- Code blocks
- Tables

See `references/formatting-guide.md` for detailed formatting guidance.
