"""
Skill discovery tools.
Discovers skills from skills/ directory with configurable search order.
"""

from pathlib import Path
from agno.tools import tool
import yaml


# Skills directory at project root
SKILLS_BASE = Path(__file__).resolve().parent.parent.parent.parent.parent.parent / "skills"


def _parse_skill_frontmatter(content: str) -> dict:
    """Parse YAML frontmatter from SKILL.md content."""
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                return yaml.safe_load(parts[1])
            except:
                pass
    return {}


def _resolve_skill_reference_path(skill_root: Path, ref_path: str) -> tuple[Path | None, bool]:
    """Resolve a reference path and ensure it stays inside the skill root."""
    root = skill_root.resolve()
    try:
        candidate = (root / ref_path).resolve()
    except OSError:
        return None, False

    try:
        candidate.relative_to(root)
    except ValueError:
        return None, True

    if candidate.exists() and candidate.is_file():
        return candidate, False
    return None, False


@tool(
    name="discover_skills",
    description="Discover available skills. Returns a list of skill names and descriptions organized by domain. Call this to see what skills you can use.",
    show_result=False
)
def discover_skills(domains: list[str] = None) -> str:
    """
    Discover skills from the skills/ directory.
    
    Args:
        domains: Optional list of domains to search (e.g., ['social-media', 'general']).
                 If not provided, searches all domains.
    
    Returns:
        Formatted list of available skills.
    """
    if not SKILLS_BASE.exists():
        return f"Error: Skills directory not found at {SKILLS_BASE}"
    
    # If no domains specified, discover all
    if domains is None:
        domains = [d.name for d in SKILLS_BASE.iterdir() if d.is_dir()]
    
    skills = []
    
    for domain in domains:
        domain_path = SKILLS_BASE / domain
        if not domain_path.exists():
            continue
            
        for skill_dir in domain_path.iterdir():
            if not skill_dir.is_dir():
                continue
            skill_md = skill_dir / "SKILL.md"
            if not skill_md.exists():
                continue
                
            content = skill_md.read_text(encoding='utf-8')
            metadata = _parse_skill_frontmatter(content)
            
            skills.append({
                "name": metadata.get("name", skill_dir.name),
                "description": metadata.get("description", "No description"),
                "domain": domain,
                "path": str(skill_dir),
            })
    
    # Format as readable string
    result = "## Available Skills\n\n"
    
    # Group by domain
    by_domain = {}
    for s in skills:
        if s["domain"] not in by_domain:
            by_domain[s["domain"]] = []
        by_domain[s["domain"]].append(s)
    
    for domain, domain_skills in by_domain.items():
        result += f"### {domain}/\n"
        for s in domain_skills:
            result += f"- **{s['name']}**: {s['description']}\n"
        result += "\n"
    
    return result


@tool(
    name="get_skill_instructions",
    description="Load the full instructions for a skill. Use after discovering skills to get detailed process, rules, and format.",
    show_result=False
)
def get_skill_instructions(skill_name: str, domains: list[str] = None) -> str:
    """
    Read the full SKILL.md content for a skill.
    
    Args:
        skill_name: Name of the skill (e.g., 'hygiene-check', 'intent-loop')
        domains: Optional list of domains to search in priority order.
                 If not provided, searches all domains.
    
    Returns:
        Full SKILL.md content with instructions
    """
    if not SKILLS_BASE.exists():
        return f"Error: Skills directory not found at {SKILLS_BASE}"
    
    # If no domains specified, search all
    if domains is None:
        domains = [d.name for d in SKILLS_BASE.iterdir() if d.is_dir()]
    
    for domain in domains:
        skill_path = SKILLS_BASE / domain / skill_name / "SKILL.md"
        if skill_path.exists():
            return skill_path.read_text(encoding='utf-8')
    
    return f"Error: Skill '{skill_name}' not found in domains: {domains}"


@tool(
    name="get_skill_reference",
    description="Load a reference file from a skill (e.g., checklists, templates). Use when skill instructions mention loading a reference.",
    show_result=False
)
def get_skill_reference(skill_name: str, ref_path: str, domains: list[str] = None) -> str:
    """
    Read a reference file from a skill directory.
    
    Args:
        skill_name: Name of the skill (e.g., 'hygiene-check')
        ref_path: Path to reference file (e.g., 'references/linkedin-checklist.md')
        domains: Optional list of domains to search in priority order.
    
    Returns:
        Content of the reference file
    """
    if not SKILLS_BASE.exists():
        return f"Error: Skills directory not found at {SKILLS_BASE}"
    if not ref_path:
        return "Error: Reference path is required"
    
    # If no domains specified, search all
    if domains is None:
        domains = [d.name for d in SKILLS_BASE.iterdir() if d.is_dir()]
    
    blocked_escape_attempt = False
    for domain in domains:
        skill_root = SKILLS_BASE / domain / skill_name
        if not skill_root.exists() or not skill_root.is_dir():
            continue

        full_path, escaped_root = _resolve_skill_reference_path(skill_root, ref_path)
        if escaped_root:
            blocked_escape_attempt = True
            continue
        if full_path is not None:
            return full_path.read_text(encoding='utf-8')

    if blocked_escape_attempt:
        return "Error: Invalid reference path. Path must stay inside the skill directory."

    return f"Error: Reference '{ref_path}' not found in skill '{skill_name}'"
