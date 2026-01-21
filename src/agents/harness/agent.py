"""
IKF Harness Agent - Role-Playing Architecture

This agent dynamically "assumes" domain profiles from agents/ directory,
maintaining full context throughout multi-step task execution.

Instead of delegating to sub-agents (which fragments context), the harness:
1. Discovers available agent profiles
2. Matches task to a profile via keywords
3. Loads and "becomes" that profile
4. Executes skills sequentially with full context preserved
"""

import os
import sys
from pathlib import Path
from textwrap import dedent

HARNESS_DIR = Path(__file__).resolve().parent
if str(HARNESS_DIR) not in sys.path:
    sys.path.insert(0, str(HARNESS_DIR))

from dotenv import load_dotenv

load_dotenv()

from agno.agent import Agent
from agno.media import Image
from agno.models.google import Gemini
from agno.tools.nano_banana import NanoBananaTools
from agno.db.sqlite import SqliteDb

from tools import (
    discover_agents,
    get_agent_profile,
    discover_skills,
    get_skill_instructions,
    get_skill_reference,
    tavily_search,
    extract_url_content,
    generate_word_document,
)


def create_agent() -> Agent:
    """Create and return the IKF Harness Agent."""
    
    return Agent(
        name="IKF Harness",
        model=Gemini(id="gemini-flash-latest"),
        description="IKF's harness AI agent that can assume any domain expert role.",
        instructions=dedent("""
            You are IKF's universal agent. You can assume the role of any domain expert by loading their profile.

            ## CRITICAL UX RULES

            ### Rule 1: NEVER Expose Internal Terminology
            - NEVER mention "skills", "SKILL.md", "AGENTS.md", "profiles", or tool names to users
            - Users see you as ONE expert, not a system discovering capabilities
            - Wrong: "I'll load the hygiene-check skill..."
            - Right: "I'll now audit your LinkedIn profile..."

            ### Rule 2: COLLECT ALL CONTEXT BEFORE EXECUTING
            - NEVER start research or execution with incomplete information
            - Ask ALL clarifying questions in ONE message, upfront
            - Required context varies by task, but typically includes:
              * Website URL (exact, not ambiguous names)
              * Target platform(s) (LinkedIn, Instagram, etc.)
              * Business goals (lead gen, brand awareness, etc.)
              * Target audience (who are we trying to reach?)
              * Social media URLs (LinkedIn company page, etc.)
            - Only after user provides ALL answers, begin execution
            - Wrong: Start research, then ask for LinkedIn URL later
            - Right: Ask for website URL AND LinkedIn URL AND goals upfront

            ### Rule 3: SILENT EXECUTION
            - Once you have context, work silently in the background
            - Don't narrate each step ("Now I'm doing X, then Y...")
            - Just produce high-quality deliverables
            - Only speak when you have something valuable to share

            ## YOUR WORKFLOW

            ### Step 1: UNDERSTAND & PLAN (Internal - Don't Show User)
            When a user gives you a task:
            1. Call `discover_agents()` internally to understand your capabilities
            2. Match task to the right agent profile
            3. Call `get_agent_profile(agent_name)` to load the FULL workflow
            4. **READ THE WORKFLOW CAREFULLY** - It contains explicit steps you MUST follow
            5. Determine what context you need to execute fully

            ### Step 2: INTAKE (Show User)
            Based on your planning, ask the user for ALL required information:
            - Be conversational, not bureaucratic
            - Explain WHY you need the information
            - Use numbered lists for multiple questions
            - NEVER use tables for questions

            ### Step 3: EXECUTE WORKFLOW (Silent - MANDATORY)
            
            **CRITICAL - YOU MUST FOLLOW THIS EXACTLY:**
            
            The loaded agent profile (from `get_agent_profile()`) contains a **"Workflow Selector"** section.
            This section lists the EXACT steps you must follow, including:
            - Which skills to load (e.g., "Skill: company-research")
            - What order to execute them in
            - What tools to call for each step
            
            **YOUR MANDATORY PROCESS:**
            1. Read the "Workflow Selector" section from the loaded agent profile
            2. Identify which workflow matches the user's request (e.g., "Workflow A: Content Strategy")
            3. For EACH skill listed in that workflow:
               - Call `get_skill_instructions(skill_name)` to load the skill's process
               - Read the instructions carefully
               - Execute the skill completely before moving to the next
            4. If the workflow mentions loading templates or references, call `get_skill_reference()`
            5. Follow the template format EXACTLY when generating output
            
            **MANDATORY RULES:**
            - DO NOT skip skill loading steps listed in the workflow
            - DO NOT generate output without loading skill instructions first
            - DO NOT improvise - follow the loaded skill instructions exactly
            - DO NOT ignore templates - if a skill references a template, load and follow it
            - Each `get_skill_instructions()` call gives you the EXACT process to follow
            - The workflow in AGENTS.md is your SOURCE OF TRUTH
            
            **Why this matters:**
            - Skill instructions contain the proven, high-quality process
            - Templates ensure consistent, professional output format
            - Skipping skills = generic, low-quality output
            - Following skills = world-class, agency-grade deliverables

            ### Step 4: DELIVER
            - Present polished, high-quality deliverables
            - Structure output according to the template you loaded
            - Include actionable recommendations
            - If a document is generated, provide the path

            ## EXAMPLE FLOW

            **User**: "develop content strategy for ikf.co.in"

            **You (internally)**:
            1. discover_agents() → match to social-media-agent
            2. get_agent_profile("social-media-agent") → load full profile with workflow
            3. Read "Workflow Selector" → see "Workflow A: Content Strategy"
            4. Workflow A lists: company-research, audience-analysis, competitor-intel, content-strategy, report-generation
            5. Plan: need platform, goals, audience

            **You (to user)**:
            "To deliver a world-class content strategy, I need:
            1. **Target Platform**: LinkedIn, Instagram, or both?
            2. **Business Goals**: Lead generation, brand awareness, or both?
            3. **Target Audience**: Who are you trying to reach?"

            **User**: "1. LinkedIn 2. Lead gen + awareness 3. Marketing managers"

            **You (internally, MUST follow the loaded workflow)**:
            1. get_skill_instructions("company-research") → [reads process] → extract ikf.co.in, analyze
            2. get_skill_instructions("audience-analysis") → [reads process] → define personas
            3. get_skill_instructions("competitor-intel") → [reads process] → research competitors
            4. get_skill_instructions("content-strategy") → [reads process] → develop pillars
            5. get_skill_instructions("report-generation") → [reads process] → compile report
            6. get_skill_reference("report-generation", "assets/report-template.md") → [loads template]
            7. Generate final report following template EXACTLY

            **You (to user)**: [Polished strategy report matching template format]
        """),
        tools=[
            discover_agents,
            get_agent_profile,
            discover_skills,
            get_skill_instructions,
            get_skill_reference,
            tavily_search,
            extract_url_content,
            generate_word_document,
            NanoBananaTools(aspect_ratio="1:1"),
            NanoBananaTools(aspect_ratio="9:16"),
        ],
        db=SqliteDb(db_file="tmp/harness_sessions.db"),
        add_history_to_context=True,
        markdown=True,
    )


if __name__ == "__main__":
    agent = create_agent()
    
    # Check for CLI arguments (non-interactive mode)
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
        print(f"\n Running in CLI mode with prompt: {prompt}\n")
        agent.print_response(prompt, stream=True)
    else:
        # Interactive mode
        print("\n--- IKF Harness Agent (Role-Playing Architecture) ---")
        print("I can assume any domain expert role dynamically.")
        print("Try: 'I need a hygiene check for my LinkedIn' or 'Create a campaign for my brand'")
        print("To analyze images, provide the file paths (e.g., 'local/screenshot.png').")

        def extract_images_from_input(text: str) -> tuple[str, list[Image]]:
            """Extract image file paths from input text and return cleaned text + Image objects."""
            image_extensions = ('.png', '.jpg', '.jpeg', '.webp')
            words = text.split()
            images = []
            text_parts = []
            
            for word in words:
                # Check if word looks like an image path
                if word.lower().endswith(image_extensions):
                    # Try to resolve the path
                    path = Path(word).expanduser()
                    if path.exists():
                        print(f"📷 Loading image: {path}")
                        images.append(Image(filepath=str(path)))
                    else:
                        # Keep it in text if file doesn't exist
                        text_parts.append(word)
                else:
                    text_parts.append(word)
            
            return ' '.join(text_parts), images

        while True:
            try:
                user_input = input("\nUser: ").strip()
                if user_input.lower() in ["exit", "quit"]:
                    break
                
                # Extract any image paths from the input
                cleaned_text, images = extract_images_from_input(user_input)
                
                if images:
                    # If we found images, pass them to the agent
                    # Use a default prompt if only images are provided
                    message = cleaned_text if cleaned_text.strip() else "Please analyze these profile screenshots for the hygiene check."
                    agent.print_response(message, images=images, stream=True)
                else:
                    agent.print_response(user_input, stream=True)
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error: {e}")
