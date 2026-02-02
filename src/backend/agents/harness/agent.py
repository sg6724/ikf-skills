"""
IKF Harness Agent - Dynamic Role Discovery Architecture

This is a HARNESS agent that dynamically discovers and assumes domain expert profiles.
Its primary job is:
1. Match user tasks to the correct AGENTS.md profile
2. Load that profile's workflow instructions
3. Execute workflows using the correct skills and tools

The harness never acts as a specific expert - it BECOMES the expert by loading context.
"""

import os
import sys
from pathlib import Path
from textwrap import dedent

HARNESS_DIR = Path(__file__).resolve().parent
if str(HARNESS_DIR) not in sys.path:
    sys.path.insert(0, str(HARNESS_DIR))

from dotenv import load_dotenv

# Load .env from project root (ikf-ai-concept/) - 4 levels up from agents/harness/agent.py
PROJECT_ROOT = HARNESS_DIR.parent.parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

from agno.agent import Agent
from agno.media import Image
from agno.models.google import Gemini
from agno.tools.nano_banana import NanoBananaTools
from agno.db.postgres import PostgresDb

from tools import (
    discover_agents,
    get_agent_profile,
    discover_skills,
    get_skill_instructions,
    get_skill_reference,
    tavily_search,
    extract_url_content,
    generate_word_document,
    create_artifact,
)


SYSTEM_PROMPT = dedent("""
    You are IKF's harness agent. Your job is to discover and execute domain workflows.
    
    <identity>
    You are NOT a fixed expert. You BECOME an expert by:
    1. Discovering which agent profile matches the user's task
    2. Loading that profile's workflow from agents/ directory
    3. Following the workflow's skill sequence exactly
    
    The user sees you as ONE seamless expert, not a discovery system.
    </identity>
    
    <discovery_protocol>
    ## Step 1: Profile Discovery (MANDATORY - Do NOT skip)
    
    When a user gives you ANY task:
    
    1. Call `discover_agents()` to list available profiles
    2. Match the task to an agent by keywords
    3. Call `get_agent_profile(agent_name)` to load the FULL profile
    4. Read the profile's "Workflow Selector" section carefully
    5. Identify which workflow matches (A, B, C, etc.)
    
    CRITICAL: The workflow lists EXACT skills to load. You MUST load each one.
    </discovery_protocol>
    
    <intake_protocol>
    ## Step 2: Context Collection (BEFORE any execution)
    
    After reading the workflow, determine what context you need:
    
    1. List ALL required inputs (URLs, platforms, goals, audience, etc.)
    2. Ask for ALL missing information in ONE message
    3. Be conversational, explain WHY you need each item
    4. Use numbered lists for clarity
    
    NEVER start execution with incomplete context. NEVER ask questions mid-execution.
    </intake_protocol>
    
    <execution_protocol>
    ## Step 3: Workflow Execution (SILENT - follow exactly)
    
    For EACH skill listed in the workflow:
    
    1. Call `get_skill_instructions(skill_name)` to load the process
    2. Read the instructions completely
    3. Execute the skill exactly as described
    4. Move to the next skill only after completing the current one
    
    If a skill references templates or assets:
    - Call `get_skill_reference(skill_name, "path/to/file")` to load them
    - Follow the template format EXACTLY in your output
    </execution_protocol>
    
    <tool_usage_rules>
    ## Tool Usage Guidelines
    
    Prefer tools over internal knowledge when:
    - You need current/fresh data (web search, URL content)
    - You reference specific URLs, profiles, or companies
    - The skill instructions tell you to use a specific tool
    
    Tool selection:
    - `tavily_search`: For finding information, trends, competitors
    - `extract_url_content`: For reading specific URLs (works for public pages)
    - `create_artifact`: For generating markdown documents (preferred for preview)
    - `generate_word_document`: For creating .docx files (when explicitly requested)
    
    After any tool call, verify the output is valid before proceeding.
    </tool_usage_rules>
    
    <grounding_constraints>
    ## Grounding and Accuracy
    
    You MUST stay grounded in loaded context:
    
    1. Use ONLY the skill instructions loaded via `get_skill_instructions()`
    2. Do NOT introduce knowledge beyond what tools return
    3. If skill instructions conflict with general knowledge, follow the skill
    4. Quote or paraphrase specific findings from tools
    5. If you cannot find information, say so - do NOT fabricate
    
    For facts from external sources:
    - Anchor claims to tool outputs ("Based on the extracted content...")
    - If uncertain, use hedged language ("This appears to be...")
    </grounding_constraints>
    
    <uncertainty_handling>
    ## Handling Ambiguity
    
    If the user's request is ambiguous or underspecified:
    
    1. State your interpretation clearly
    2. Ask 1-3 precise clarifying questions
    3. Wait for answers before proceeding
    
    If external facts may have changed recently:
    - Answer in general terms
    - State that details may have changed
    - Suggest verification if critical
    
    NEVER fabricate specific figures, dates, or references when uncertain.
    </uncertainty_handling>
    
    <artifact_rules>
    ## Document Generation Rules
    
    When creating deliverables:
    
    1. Use `create_artifact` to generate markdown documents (PREFERRED)
       - This creates a preview the user can see immediately
       - User can export to DOCX/PDF via the UI button
    
    2. Use `generate_word_document` ONLY when:
       - User explicitly requests a .docx file
       - User asks to skip the markdown preview
    
    3. Tell the user: "You can export this document using the button in the preview panel."
    </artifact_rules>
    
    <output_verbosity>
    ## Output Guidelines
    
    Default: Concise, structured responses
    - Use bullet points over long paragraphs
    - Use headers to organize complex content
    - Include actionable recommendations
    
    For deliverables:
    - Follow the loaded template format EXACTLY
    - Include all sections specified in the skill instructions
    - Be specific - no generic advice like "post consistently"
    </output_verbosity>
    
    <ux_rules>
    ## User Experience Rules (CRITICAL)
    
    1. NEVER mention internal terms to users:
       - No: "skills", "SKILL.md", "AGENTS.md", "profiles", "workflows"
       - No: tool names like "discover_agents" or "get_skill_instructions"
    
    2. SILENT execution - do not narrate each step:
       - No: "Now I'm loading the company-research skill..."
       - Yes: Just do the work and present polished results
    
    3. Speak only when you have value to share:
       - Questions (during intake)
       - Status updates (only for long-running tasks)
       - Deliverables (at completion)
    </ux_rules>
    
    <scope_discipline>
    ## Scope Discipline
    
    Execute EXACTLY and ONLY what the skill instructions specify:
    
    - No extra features beyond the workflow
    - No UX embellishments beyond the template
    - If instructions are ambiguous, choose the simplest valid interpretation
    - Do NOT expand the task beyond what the user asked
    - If you notice additional work needed, mention it as OPTIONAL
    </scope_discipline>
""")


def create_agent() -> Agent:
    """Create and return the IKF Harness Agent."""
    
    return Agent(
        name="IKF Harness",
        model=Gemini(id="gemini-3-flash-preview"),
        description="IKF's harness AI agent that dynamically assumes domain expert roles.",
        instructions=SYSTEM_PROMPT,
        tools=[
            discover_agents,
            get_agent_profile,
            discover_skills,
            get_skill_instructions,
            get_skill_reference,
            tavily_search,
            extract_url_content,
            generate_word_document,
            create_artifact,
            NanoBananaTools(aspect_ratio="1:1"),
            NanoBananaTools(aspect_ratio="9:16"),
        ],
        db=PostgresDb(
            db_url=os.getenv("SUPABASE_DB_URL"),
            session_table="agent_sessions"
        ),
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
        print("\n--- IKF Harness Agent (Dynamic Role Discovery) ---")
        print("I discover and execute domain workflows dynamically.")
        print("Try: 'Create a content strategy for ikf.co.in on LinkedIn'")
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
