---
name: image-generation
description: Generate ad images using NanoBanana with style inference and user confirmation.
---

# Image Generation

Use this skill to generate campaign images via NanoBanana (Gemini image generation).

## Process

1. **Infer Visual Style from Research**
   
   Based on brand intake and competitor research, determine:
   - **Color palette**: Brand colors or complementary
   - **Photography style**: Lifestyle, product-focused, abstract, UGC
   - **Aesthetic**: Minimalist, bold, playful, premium, editorial
   - **Text overlay**: Required or clean images
   
   Example inference:
   > "Based on your brand assets and competitor analysis, I recommend a **lifestyle photography** style with **warm, earthy tones**. Your competitors use polished studio shots, but user-generated-style content outperforms in your niche."

2. **Confirm with User**
   
   Present style recommendation and ask:
   > "Does this visual direction feel right for your brand? Or would you prefer a different style? Options include:
   > 1. Hyper-realistic product photography
   > 2. Minimalist with bold typography
   > 3. Lifestyle/UGC aesthetic
   > 4. Illustrated/graphic style
   > 5. Something else (describe)"
   
   **Wait for confirmation before generating.**

3. **Generate Images**
   
   Use NanoBanana with appropriate aspect ratios:
   - **Instagram Feed**: 1:1 (square) or 4:5 (portrait)
   - **Instagram Stories**: 9:16 (vertical)
   - **Carousel slides**: 1:1
   
   For each image, create a detailed prompt:
   ```
   [Scene description]. [Style: lifestyle/minimalist/etc]. 
   [Color palette: brand colors]. [Mood: energetic/calm/bold]. 
   [Composition: centered product/lifestyle scene/text overlay space].
   High quality, professional marketing photo.
   ```

4. **Prompt Engineering Best Practices**
   
   Include in prompts:
   - Scene and subject description
   - Style keywords (e.g., "editorial photography", "flat lay")
   - Lighting (natural, studio, golden hour)
   - Color guidance (specific colors or mood)
   - Composition notes
   - Quality markers ("professional", "high resolution", "marketing quality")
   
   Avoid:
   - Vague descriptions
   - Too many conflicting elements
   - Text in images (Gemini struggles with text)

5. **Save Images**
   
   Use the `save_campaign_asset` tool:
   ```python
   save_campaign_asset(
       content=image_bytes,
       brand_name="brand-name",
       asset_type="images",
       filename="instagram-post-1.png"
   )
   ```

## Example Prompts

**Lifestyle product shot:**
```
A woman in her 30s using [product] in a bright, modern home office. 
Natural window lighting, warm tones. 
The product is visible but the focus is on the calm, productive moment.
Lifestyle photography, editorial quality, soft shadows.
Colors: [brand primary], neutral whites and beiges.
```

**Bold graphic for carousel:**
```
Minimalist background in [brand color]. 
Clean composition with ample negative space on the right for text overlay.
Subtle gradient from [color 1] to [color 2].
Modern, premium aesthetic. Sharp edges, clean design.
```

**UGC-style product:**
```
Authentic-looking photo of [product] on a messy desk with coffee and notebook.
Shot from above, iPhone-quality aesthetic.
Natural daylight, slight shadows. Lived-in, real feeling.
Not overly polished - casual lifestyle shot.
```

## Critical Rules

1. **Infer first, confirm second** - Show reasoning then ask
2. **Appropriate aspect ratios** - Match platform specs
3. **Detailed prompts** - Specific descriptions generate better images
4. **No text in images** - Create text overlays separately if needed
5. **Save to deck folder** - Use the custom save tool

## Output

Save generated images to `campaign-deck/[brand]/images/`
