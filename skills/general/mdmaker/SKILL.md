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
   - Do NOT print local file paths, raw URLs, filenames, or download/status labels in user-facing text
   - Keep user-facing text focused on content outcomes; artifact UI handles download controls

## Usage

The agent should call this skill to save markdown files.

**Correct workflow:**
```
1. Prepare your markdown content
2. Call create_artifact(title="Report", content=markdown_text, artifact_type="report")
```

This will save the markdown and emit artifact metadata for the UI card.

## Script Parameters

When calling `create_artifact`, provide:
- `title`: Artifact title
- `content`: Your markdown text
- `artifact_type`: Type label such as `report`, `guide`, or `plan` (optional; defaults to `document`)

Returns: Metadata for the generated .md artifact

## Supported Markdown

- Headings (H1-H6)
- Bold and italic text
- Bullet lists and numbered lists
- Clickable links `[text](url)`
- Code blocks
- Tables

See `references/formatting-guide.md` for detailed formatting guidance.
