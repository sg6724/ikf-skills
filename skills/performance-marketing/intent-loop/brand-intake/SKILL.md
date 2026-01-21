---
name: brand-intake
description: Quick, focused intake to understand the brand before campaign ideation.
---

# Brand Intake

Get the essential info fast. No bureaucracy.

## What to Ask

Ask in a natural, conversational way—not a checklist.

Essential info:
1. **Brand + Website URL** → "What's the website?"
2. **What we're selling** → "What product/service is this campaign for?"
3. **Target audience** → "Who are we trying to reach?"
4. **Campaign goal** → "What's the objective? Leads, sales, awareness?"
5. **Budget** → "What's your budget?" (Default currency: INR)
6. **Target geography** → "Where should we target?" (for ad delivery, NOT for copy)

## Key Rules

1. **Be brief** - Don't ask 10 questions, ask what you need
2. **Don't be robotic** - "Let me gather some context" not "Initiating Brand Intake Protocol"
3. **Extract the website** - Once you have a URL, use `extract_website_content(url)`
4. **Geography is for targeting, not copy** - Never write "Pune businesses" in actual marketing

## What NOT to Do

❌ "Thank you for that comprehensive information. I will now proceed to..."
❌ "Let me initiate the Brand Intake Protocol"
❌ Asking 7+ questions in numbered format
❌ Creating internal "Context Documents" in the chat

## What TO Do

✅ "Got it. Let me pull up ikf.co.in and see what you're working with."
✅ "Quick questions: What's the budget and who's this for?"
✅ Be direct, be fast, get to the good part (ideation)

## After Intake

Once you have the essentials:
1. Use `extract_website_content(url)` on their website
2. Move directly to research and ideation
3. Don't summarize back endlessly—show them concepts

Skip to `campaign-ideation` skill once you have context.
