# Markmap Sitemap Format

This reference describes how to structure sitemaps for Markmap visualization.

## Format Requirements

Markmap uses markdown headers to create a hierarchical mind-map:
- `#` - Root node (domain)
- `##` - Top-level sections (Services, Blog, etc.)
- `###` - Individual pages
- `####` - Sub-pages (if needed)

## Clickable Links

All items should be clickable markdown links:
```markdown
# [example.com](https://example.com)

## [Services](https://example.com/services)
### [Web Development](https://example.com/services/web-development)
### [Digital Marketing](https://example.com/services/digital-marketing)
```

## URL Grouping Strategy

Group URLs by first path segment:
- `/services/*` → "Services" section
- `/blog/*` → "Blog" section
- `/about`, `/contact` → "Main Navigation" section

### Section Name Mappings
| Path Segment | Display Name |
|--------------|--------------|
| about, about-us | About |
| services | Services |
| blog, blogs | Blog |
| news | News |
| team, doctors | Team |
| contact, contact-us | Contact |
| careers | Careers |
| products | Products |
| gallery, portfolio | Gallery |

## Example Output

```markdown
# [ikf.co.in](https://www.ikf.co.in)

## Main Navigation
### [About Us](https://www.ikf.co.in/about-us/)
### [Clients](https://www.ikf.co.in/clients/)
### [Contact](https://www.ikf.co.in/contact-us/)

## [Services](https://www.ikf.co.in/services/)
### [Website Development](https://www.ikf.co.in/website-development-company-pune/)
### [Digital Marketing](https://www.ikf.co.in/digital-marketing-company-pune/)
### [SEO Services](https://www.ikf.co.in/seo-company-pune/)

## [Blog](https://www.ikf.co.in/blog/)
### [Post Title 1](https://www.ikf.co.in/blog/post-1/)
### [Post Title 2](https://www.ikf.co.in/blog/post-2/)

---

**How to visualize:**
1. Copy ALL the markdown above
2. Open https://markmap.js.org/repl
3. Paste into the LEFT panel
4. Interactive sitemap appears on the RIGHT
```

## Visualization

Users visualize the output at https://markmap.js.org/repl:
1. Copy entire markdown output
2. Paste into left panel
3. Mind-map renders on right
