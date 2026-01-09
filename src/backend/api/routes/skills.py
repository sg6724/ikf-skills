from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import List

from src.backend.api.models import SkillInfo, SkillsListResponse

router = APIRouter(prefix="/api/skills", tags=["skills"])


def get_skills_base_dir() -> Path:
    """Get the base skills directory"""
    return Path(__file__).resolve().parent.parent.parent.parent.parent / "skills"


def scan_skills_directory(domain: str = None) -> List[SkillInfo]:
    """
    Scan the skills directory and return skill information.
    
    Args:
        domain: Optional domain filter (e.g., "social-media")
    
    Returns:
        List of SkillInfo objects
    """
    skills_base = get_skills_base_dir()
    skills = []
    
    # If domain is specified, scan only that domain
    if domain:
        domain_path = skills_base / domain
        if not domain_path.exists():
            return []
        scan_paths = [(domain, domain_path)]
    else:
        # Scan all domains (subdirectories in skills/)
        scan_paths = [
            (d.name, d) for d in skills_base.iterdir() 
            if d.is_dir() and not d.name.startswith('.')
        ]
    
    for domain_name, domain_path in scan_paths:
        # Each skill is a subdirectory within the domain
        for skill_dir in domain_path.iterdir():
            if not skill_dir.is_dir() or skill_dir.name.startswith('.'):
                continue
            
            # Check for SKILL.md
            skill_file = skill_dir / "SKILL.md"
            if not skill_file.exists():
                continue
            
            # Read description from SKILL.md (first few lines)
            description = None
            try:
                with open(skill_file, 'r') as f:
                    lines = f.readlines()
                    # Look for description after the title
                    for i, line in enumerate(lines):
                        if line.strip() and not line.startswith('#'):
                            description = line.strip()
                            break
            except Exception:
                pass
            
            # Check for references directory
            references_dir = skill_dir / "references"
            assets_dir = skill_dir / "assets"
            has_references = references_dir.exists() or assets_dir.exists()
            
            reference_files = []
            if references_dir.exists():
                reference_files.extend([
                    f"references/{f.name}" for f in references_dir.iterdir()
                    if f.is_file() and not f.name.startswith('.')
                ])
            if assets_dir.exists():
                reference_files.extend([
                    f"assets/{f.name}" for f in assets_dir.iterdir()
                    if f.is_file() and not f.name.startswith('.')
                ])
            
            skills.append(SkillInfo(
                name=skill_dir.name,
                domain=domain_name,
                description=description,
                has_references=has_references,
                reference_files=reference_files
            ))
    
    return skills


@router.get("", response_model=SkillsListResponse)
async def list_all_skills() -> SkillsListResponse:
    """
    List all available skills across all domains.
    
    Returns skill metadata including:
    - Skill name and domain
    - Description from SKILL.md
    - Available reference files
    """
    skills = scan_skills_directory()
    return SkillsListResponse(skills=skills, total=len(skills))


@router.get("/{domain}", response_model=SkillsListResponse)
async def list_skills_by_domain(domain: str) -> SkillsListResponse:
    """
    List all skills in a specific domain (e.g., social-media).
    """
    skills = scan_skills_directory(domain=domain)
    if not skills:
        raise HTTPException(status_code=404, detail=f"Domain '{domain}' not found or has no skills")
    return SkillsListResponse(skills=skills, total=len(skills))


@router.get("/{domain}/{skill_name}")
async def get_skill_details(domain: str, skill_name: str) -> SkillInfo:
    """
    Get detailed information about a specific skill.
    """
    skills = scan_skills_directory(domain=domain)
    skill = next((s for s in skills if s.name == skill_name), None)
    
    if not skill:
        raise HTTPException(
            status_code=404,
            detail=f"Skill '{skill_name}' not found in domain '{domain}'"
        )
    
    return skill


# Future endpoints for skills CRUD:
# @router.post("/{domain}/{skill_name}")  # Create/upload new skill
# @router.put("/{domain}/{skill_name}")   # Update skill
# @router.delete("/{domain}/{skill_name}") # Delete skill
