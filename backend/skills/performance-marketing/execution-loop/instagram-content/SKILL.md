---
name: instagram-content
description: Generate Instagram content strategy including posts, stories, and reels concepts optimized for engagement.
---

# Instagram Content

Use this skill to create Instagram content for the selected campaign theme.

## Process

1. **Load Selected Theme Context**
   - Retrieve the campaign theme user selected
   - Review brand context from intake
   - Consider visual style direction

2. **Generate Content Mix**
   Create up to 5 content pieces with variety:
   
   **Feed Posts** (1-2 pieces)
   - Carousel or single image
   - Educational, promotional, or storytelling
   - Caption with hook + value + CTA
   
   **Stories** (1-2 concepts)
   - Ephemeral, casual, interactive
   - Use polls, questions, countdowns
   - Behind-the-scenes or quick tips
   
   **Reels** (1-2 concepts)
   - Short-form video idea (script outline)
   - Trending audio/format suggestions
   - Hook in first 3 seconds

3. **Content Specification Format**
   
   For each content piece:
   ```
   ## [Content Type]: [Title/Hook]
   
   **Format**: [Carousel/Single/Story/Reel]
   **Objective**: [Awareness/Engagement/Traffic]
   
   **Visual Concept**:
   - Image 1: [description for image generation]
   - Image 2: [if carousel]
   
   **Caption**:
   [Full caption with emojis, line breaks, hashtags]
   
   **CTA**: [What action we want]
   
   **Posting Notes**: [Best time, any context]
   ```

4. **Image Generation Prompts**
   For each visual, prepare a detailed prompt for NanoBanana:
   - Include brand colors and style
   - Specify composition and mood
   - Reference the visual direction from theme

## Example Output

```
## Feed Post 1: "The Problem No One Talks About"

**Format**: Carousel (3 slides)
**Objective**: Engagement + saves

**Visual Concept**:
- Slide 1: Bold text overlay on gradient background - "Why 90% of [X] fail"
- Slide 2: Problem breakdown with icons
- Slide 3: Solution teaser with product subtle placement

**Caption**:
Here's what nobody tells you about [topic] ⬇️

Most people think [common belief].
But after working with 100+ [audience], we found...

[Insight 1]
[Insight 2]
[Insight 3]

The solution? It's simpler than you think.
(Hint: it's in our bio)

Save this for later 📌

#[hashtag1] #[hashtag2] #[hashtag3]

**CTA**: Save + comment

**Posting Notes**: Tuesday or Thursday, 11am-1pm
```

## Critical Rules

1. **Be specific** - No generic "post about your product" advice
2. **Optimize for platform** - Instagram-native formats and trends
3. **Include full captions** - Ready to copy-paste
4. **Prepare image prompts** - Detailed enough for NanoBanana
5. **Max 5 pieces** - Quality over quantity for Phase 1

## Output

Save content specs to `campaign-deck/[brand]/copy/instagram/` as individual `.md` files.
