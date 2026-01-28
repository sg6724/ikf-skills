"""
Agent discovery tools for the harness.
Discovers agent profiles from agents/ directory.
"""

from pathlib import Path
from agno.tools import tool
import yaml


# Agents directory at project root
AGENTS_BASE = Path(__file__).resolve().parent.parent.parent.parent.parent.parent / "agents"


def _parse_agent_frontmatter(content: str) -> dict:
    """Parse YAML frontmatter from AGENTS.md content."""
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                return yaml.safe_load(parts[1])
            except:
                pass
    return {}


@tool(
    name="discover_agents",
    description="Discover available agent profiles. Returns a list of agent names, descriptions, and routing keywords. Call this to see what domain experts you can assume.",
    show_result=False
)
def discover_agents() -> str:
    """
    Discover agent profiles from the agents/ directory.
    Returns formatted list of available agents with their keywords.
    """
    agents = []
    
    if not AGENTS_BASE.exists():
        return f"Error: Agents directory not found at {AGENTS_BASE}"
    
    for agent_dir in AGENTS_BASE.iterdir():
        if not agent_dir.is_dir():
            continue
        agents_md = agent_dir / "AGENTS.md"
        if not agents_md.exists():
            continue
            
        content = agents_md.read_text(encoding='utf-8')
        metadata = _parse_agent_frontmatter(content)
        
        agents.append({
            "name": metadata.get("name", agent_dir.name),
            "description": metadata.get("description", "No description"),
            "keywords": metadata.get("keywords", []),
            "skills_dirs": metadata.get("skills_dirs", []),
            "path": str(agent_dir),
        })
    
    # Format as readable string
    result = "## Available Agent Profiles\n\n"
    for a in agents:
        keywords = ", ".join(a["keywords"]) if isinstance(a["keywords"], list) else a["keywords"]
        result += f"### {a['name']}\n"
        result += f"**Description**: {a['description']}\n"
        result += f"**Keywords**: {keywords}\n"
        result += f"**Skills**: {', '.join(a['skills_dirs'])}\n\n"
    
    return result


@tool(
    name="get_agent_profile",
    description="Load the full profile for an agent. Use after discovering agents to get the complete instructions and workflow for assuming that role.",
    show_result=False
)
def get_agent_profile(agent_name: str) -> str:
    """
    Read the full AGENTS.md content for an agent profile.
    
    Args:
        agent_name: Name of the agent (e.g., 'social-media-agent', 'performance-marketing-agent')
                   Also accepts directory names like 'social-media' or 'performance-marketing'
    
    Returns:
        Full AGENTS.md content with instructions
    """
    if not AGENTS_BASE.exists():
        return f"Error: Agents directory not found at {AGENTS_BASE}"
    
    # Try exact directory match first
    for agent_dir in AGENTS_BASE.iterdir():
        if not agent_dir.is_dir():
            continue
        
        agents_md = agent_dir / "AGENTS.md"
        if not agents_md.exists():
            continue
        
        # Match by directory name
        if agent_dir.name == agent_name or agent_dir.name == agent_name.replace("-agent", ""):
            return agents_md.read_text(encoding='utf-8')
        
        # Match by name in frontmatter
        content = agents_md.read_text(encoding='utf-8')
        metadata = _parse_agent_frontmatter(content)
        if metadata.get("name") == agent_name:
            return content
    
    return f"Error: Agent profile '{agent_name}' not found in {AGENTS_BASE}"
