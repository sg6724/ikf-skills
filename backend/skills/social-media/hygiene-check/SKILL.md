---
name: hygiene-check
description: Conduct social media hygiene audits for LinkedIn, Facebook, and Instagram. Identify profile gaps and generate improvement recommendations.
---

# Social Media Hygiene Check

Use this skill to audit a client's social media presence and generate a comprehensive hygiene report with actionable recommendations.

## Process

1. **Information Gathering**
   - Collect client/company name
   - **Gather direct social media URLs** (LinkedIn, Facebook, Instagram)
   - Understand brand context (industry, target audience, current tone)

2. **Platform-Specific Content Extraction**
   
   **For LinkedIn:**
   - Load the checklist: `get_skill_reference("hygiene-check", "references/linkedin-checklist.md")`
   - Use `extract_content_from_url` with the LinkedIn URL (works without login)
   - Extract real bio, about section, tagline, and visible profile elements
   
   **For Instagram or Facebook:**
   - Load the appropriate checklist:
     - `get_skill_reference("hygiene-check", "references/instagram-checklist.md")`
     - `get_skill_reference("hygiene-check", "references/facebook-checklist.md")`
   - **DO NOT use extract API** - these platforms block extraction with sign-in modals
   - **Use the screenshot provided by the user**
   - Analyze the screenshot using vision capabilities to extract:
     - Bio/About section text (read it from the image)
     - Profile picture & cover image quality assessment
     - Story highlights/covers (for Instagram)
     - Recent post samples and engagement visible
   - Quote visible text from the screenshot in your analysis
   
   - **Analyze extracted/visible content against checklist**:
     - Bio/About section (actual text from page or screenshot)
     - Profile picture & cover image (presence/quality)
     - Contact information completeness
     - Content highlights (actual posts/content visible)
   
   - **Identify concrete gaps** based on extracted content vs. checklist

3. **Fact-Based Findings**
   - **CRITICAL: All findings MUST be fact-based with citations**
   - Quote actual text from extracted content
   - Example: "Bio reads: '[actual bio text]' - Missing value proposition"
   - Example: "Cover image is generic abstract pattern - No brand messaging visible"
   - **NO assumptions, NO "likely", NO "assume", NO speculation**
   - If data isn't available from extract, state "Not visible in extracted content"

4. **Content Recommendations**
   - Draft improved bio copy (brand-aligned, clear, compelling)
   - Suggest cover image concepts based on missing elements
   - Write comprehensive About Us sections
   - Propose banner/tagline text
   - Reference `audit-criteria.md` for quality standards

5. **Client Action Items**
   - List what needs client approval
   - Specify required information (contact details, etc.)
   - Note any assets that need to be created (e.g., cover images)

6. **Document Generation - MANDATORY**
   - Load the template: `get_skill_reference("hygiene-check", "assets/hygiene-template.md")`
   - Fill in all sections following the EXACT template structure
   - **Keep it simple and clean - match the sample format exactly**
   
   - **MUST generate Word document by calling the tool**:
     ```
     generate_word_document(
         content=your_filled_markdown_content,
         output_file="results/hygiene-checks/[client-name]-hygiene.docx",
         title="Social Media Hygiene Check"
     )
     ```
   
   - The tool will return the file path - include it in your response to the user

## Critical Rules

1. **PLATFORM-SPECIFIC DATA COLLECTION**:
   - LinkedIn: Use `extract_content_from_url` (works without login)
   - Instagram/Facebook: Use screenshot + vision analysis (extract API blocked by sign-in modal)
2. **FACT-BASED ONLY** - Quote actual content extracted from pages or visible in screenshots
3. **SIMPLE FORMAT** - Follow the template exactly, keep it clean like the sample
4. **GENERATE .DOCX** - Import and call the generator directly, provide file path
5. **VISION ANALYSIS** - For screenshots, read and quote visible text directly from the image

## Output Format

**CRITICAL: Match the sample format EXACTLY:**
```
Hygiene Check

Social Media Platform - [LinkedIn, Instagram, etc.]

## LinkedIn

Suggested Bio:
[Clean, simple bio text]

Cover Image:
[Simple description]

About Us:
[Paragraph format, not list]

Banner:
[Tagline text]

## Instagram

[Same structure]

Required from client -

Approval/Feedback of:
- [Item 1]

Contact details:
- Email ID
- Phone Number
```

Do NOT use:
- ❌ Tables (use simple paragraphs)
- ❌ Complex formatting
- ❌ Excessive markdown
- ❌ Verbose explanations

## Quality Guidelines

- **Fact-based**: Quote actual text from extracted content
- **Professional tone**: Refined, agency-quality copy  
- **Simple structure**: Match sample format - clean and scannable
- **Action-oriented**: Clear next steps
- **Concise**: Direct recommendations, no fluff
