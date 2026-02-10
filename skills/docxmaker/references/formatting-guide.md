# Word Document Formatting Guide

## Available Styles

The docxmaker skill uses `python-docx` to generate Word documents. Here are the supported formatting options:

### Headings

- **Heading 1**: Main title (24pt, bold)
- **Heading 2**: Section headers (18pt, bold)
- **Heading 3**: Subsections (14pt, bold)
- **Heading 4**: Minor subsections (12pt, bold, italic)

### Text Formatting

- **Bold**: Use `**text**` in markdown
- **Italic**: Use `*text*` in markdown
- **Bold + Italic**: Use `***text***` in markdown

### Lists

- **Bullet lists**: Standard bullet points with proper indentation
- **Numbered lists**: Automatically numbered lists
- **Nested lists**: Supported up to 3 levels deep

### Paragraphs

- Normal paragraph spacing: 6pt after
- First-line indent: None (block style)
- Line spacing: 1.15

### Document Settings

- **Font**: Calibri (default Word font)
- **Size**: 11pt body text
- **Margins**: 1 inch all sides
- **Page size**: Letter (8.5" x 11")

## Usage in Skills

When generating documents, the skill will:
1. Parse markdown headers and convert to Word heading styles
2. Convert **bold** and *italic* markdown to Word formatting
3. Handle lists (bullet and numbered)
4. Add appropriate spacing between sections

## Future Enhancements

Planned features:
- Custom color schemes
- Table support
- Image embedding
- Custom templates
- Header/footer customization
