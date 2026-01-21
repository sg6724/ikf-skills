---
name: campaign-deck
description: Compile all generated assets into a structured folder-based campaign deck.
---

# Campaign Deck

Use this skill to organize all campaign assets into a deliverable folder structure.

## Folder Structure

```
results/campaigns/[brand-name-kebab-case]/
├── brief.md                    # Campaign summary and context
├── images/                     # Generated ad images
│   ├── instagram-post-1.png
│   ├── instagram-post-2.png
│   ├── instagram-story-1.png
│   └── ...
├── copy/                       # Written content
│   └── instagram/
│       ├── post-1-hook-name.md
│       ├── post-2-hook-name.md
│       └── ...
├── emails/                     # Email sequence
│   ├── email-1-welcome.md
│   ├── email-2-value.md
│   ├── email-3-pitch.md
│   └── ...
└── instructions.md             # Posting guide for the client
```

## Process

1. **Create Folder Structure**
   
   Use `save_campaign_asset` tool to create folders:
   ```python
   save_campaign_asset(brand_name="brand-name", create_folders=True)
   ```

2. **Generate Brief Document** (`brief.md`)
   
   Summarize the campaign:
   ```markdown
   # Campaign Brief: [Brand Name]
   
   ## Overview
   - **Campaign Theme**: [Selected theme name]
   - **Goal**: [Primary objective]
   - **Target Audience**: [Description]
   - **Platforms**: Instagram, Email
   
   ## Visual Direction
   [Style summary from image-generation]
   
   ## Content Summary
   - Instagram Posts: [N] pieces
   - Instagram Stories: [N] concepts
   - Email Sequence: [N] emails
   
   ## Key Messages
   1. [Primary message]
   2. [Secondary message]
   3. [Proof point]
   
   ## Next Steps
   - [ ] Review and approve all assets
   - [ ] Provide final links/CTAs for emails
   - [ ] Schedule posting calendar
   ```

3. **Generate Instructions Document** (`instructions.md`)
   
   Create posting guide:
   ```markdown
   # Campaign Posting Instructions
   
   ## Instagram
   
   ### Post 1: [Title]
   - **File**: `images/instagram-post-1.png`
   - **Caption**: See `copy/instagram/post-1.md`
   - **Suggested time**: [Day, time]
   - **Hashtags**: Included in caption
   
   [Repeat for each post]
   
   ## Email Setup
   
   ### Sequence Overview
   | Email | File | Trigger |
   |-------|------|---------|
   | 1. Welcome | `emails/email-1-welcome.md` | On signup |
   | 2. Value | `emails/email-2-value.md` | Day 2 |
   | ... | ... | ... |
   
   ### ESP Setup Notes
   - Copy content from each `.md` file
   - Replace [First Name] with personalization token
   - Add CTA button with your link
   - Set up automation triggers as noted
   
   ## Review Checklist
   - [ ] All images match brand guidelines
   - [ ] Captions have correct links
   - [ ] Email CTAs have proper URLs
   - [ ] Tracking pixels/UTMs added
   ```

4. **Compile All Assets**
   
   Ensure all generated content is saved:
   - Images from `image-generation` skill
   - Copy from `instagram-content` skill
   - Emails from `email-sequence` skill

5. **Final Summary to User**
   
   After deck is complete:
   ```markdown
   ✅ Campaign deck generated!
   
   📁 Location: `results/campaigns/[brand-name]/`
   
   Contents:
   - [N] Instagram images
   - [N] Instagram captions/concepts
   - [N] Email sequence
   - Campaign brief
   - Posting instructions
   
   What's next:
   1. Review the assets in the folder
   2. Provide any feedback for revisions
   3. Add your specific links/UTMs
   4. Schedule and post!
   ```

## Critical Rules

1. **Folder structure is fixed** - Follow the exact structure above
2. **All assets saved** - Nothing should be "described" but not saved
3. **Clear instructions** - Client should know exactly what to do
4. **Absolute paths** - Tell user the exact location
5. **Checklist included** - Help client track implementation

## Output

Complete folder at `results/campaigns/[brand-name]/`
