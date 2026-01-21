---
name: email-sequence
description: Dynamically plan and generate email sequences optimized for conversions. Outputs markdown files.
---

# Email Sequence

Use this skill to create email campaigns aligned with the selected theme.

## Process

1. **Analyze Campaign Goal**
   
   Based on the campaign objective, determine the optimal sequence type:
   
   | Goal | Sequence Type | Length |
   |------|---------------|--------|
   | Awareness | Welcome/Intro | 3-4 emails |
   | Engagement | Nurture/Value | 4-5 emails |
   | Conversions | Promo/Launch | 3-5 emails |
   | Signups | Onboarding | 3-4 emails |
   | Re-engagement | Win-back | 2-3 emails |
   
   **Do NOT use templates** - plan the sequence dynamically based on:
   - What the audience needs to know
   - Objections to address
   - Value to provide before asking

2. **Plan the Sequence Arc**
   
   Before writing, outline the journey:
   ```
   Email 1: [Purpose - e.g., Introduce, hook with story]
   Email 2: [Purpose - e.g., Provide value, build trust]
   Email 3: [Purpose - e.g., Social proof, case study]
   Email 4: [Purpose - e.g., Soft pitch, address objection]
   Email 5: [Purpose - e.g., Hard CTA, urgency]
   ```

3. **Generate Each Email**
   
   For each email, provide:
   
   ```markdown
   # Email [N]: [Internal Name]
   
   **Send timing**: [Day X of sequence / specific trigger]
   **Subject line**: [Primary subject]
   **Preview text**: [First line visible in inbox]
   
   ---
   
   [Full email body in markdown]
   
   ---
   
   **CTA Button**: [Button text]
   **CTA Link**: [Placeholder - user fills in]
   ```

4. **High-Converting Elements**
   
   Include in emails:
   - **Hook**: First line grabs attention
   - **Story/Value**: Middle section delivers value
   - **Single CTA**: One clear action per email
   - **P.S. line**: Often most-read part
   
   Subject line formulas:
   - Curiosity: "The [thing] I almost deleted"
   - Benefit: "Get [result] in [timeframe]"
   - Urgency: "[X] hours left: [offer]"
   - Question: "Is this why [problem]?"
   - Personal: "Quick question, [name]"

## Example Output

```markdown
# Email 1: The Welcome

**Send timing**: Immediately after signup
**Subject line**: Welcome to [Brand] - here's what happens next
**Preview text**: Plus a quick gift inside...

---

Hey [First Name],

Welcome to the [Brand] family 🎉

I'm [Founder Name], and I wanted to personally thank you for joining us.

Here's what you can expect:
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

But first, a quick gift: [freebie or value]

[Link]

Talk soon,
[Signature]

P.S. – Reply to this email and tell me: what's your biggest challenge with [topic]? I read every response.

---

**CTA Button**: Get Your [Gift]
**CTA Link**: [User to add]
```

## Critical Rules

1. **Dynamic planning** - No one-size-fits-all templates
2. **Conversion-focused** - Every email has a purpose in the journey
3. **Ready to use** - Full copy, not outlines
4. **Markdown format** - User copies to their ESP
5. **Personalization tokens** - Use [First Name], [Brand], etc.

## Output

Save each email as `campaign-deck/[brand]/emails/email-[N]-[name].md`
