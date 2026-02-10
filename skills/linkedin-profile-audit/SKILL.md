---
name: linkedin-profile-audit
description: Conduct a deep-dive audit of personal LinkedIn profiles. Analyzes visual branding, headlines, about sections, career history, and contact accessibility.
---

# LinkedIn Profile Audit Skill

Use this skill to perform a comprehensive professional audit of a personal LinkedIn profile and generate a client-ready assessment report.

## Process

### 1. Discovery & Extraction
*   **Request URL**: Ask the user for the exact LinkedIn profile URL.
*   **Web Extraction**: Use `extract_content_from_url` to pull the profile data.
*   **Verification**: Ensure the extraction captured the Headline, About section, Experience, and Education. If data is missing, use `web_search_using_tavily` to find public cached versions or request specific details from the user.

### 2. Audit Framework
Load the audit criteria: `get_skill_reference("linkedin-profile-audit", "references/audit-checklist.md")`.

Analyze the extracted content against these 6 pillars:
1.  **Visual First Impression**: Profile photo and background banner alignment with professional goals.
2.  **Narrative & Headline**: Effectiveness of the headline and the storytelling in the 'About' section.
3.  **Career Trajectory**: Clarity and impact of the Experience section (focusing on achievements, not just tasks).
4.  **Academic & Skill Credibility**: Review of Education, Certifications, and Skills.
5.  **Engagement & Social Proof**: Assessment of Recommendations and activity levels.
6.  **Contact & Accessibility**: Completeness of contact info and custom URL.

### 3. Report Generation
*   **Structure**: Follow the `assets/audit-report-template.md`.
*   **Fact-Based Analysis**: Quote the user's current headline or bio before providing the "Improved" version.
*   **Actionable Advice**: Every "Red Flag" must have a specific "Fix."

### 4. Output
*   Generate the final report as a professional Word document using the `generate_word_document` tool.
*   **Title**: LinkedIn Professional Audit - [Name]

## Critical Rules
*   **No Generic Fluff**: Do not use vague advice like "Make it better." Use "Replace [current text] with [specific text]."
*   **Tone**: Professional, encouraging, and agency-grade.
*   **Privacy**: Do not store or display sensitive contact info in the chat interface; only include it in the final document.
