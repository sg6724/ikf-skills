"""
Skills Registry - Manages discovery and metadata for Agent Skills.
Reads from the `skills/` directory and parses SKILL.md files.
"""
from pathlib import Path
from typing import List, Dict, Any, Optional
import re
import os

from fasthtml.common import *


class SkillMetadata:
    """Metadata for an Agent Skill"""
    def __init__(self, id: str, name: str, description: str, category: str, path: Path):
        self.id = id
        self.name = name
        self.description = description
        self.category = category
        self.path = path

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "path": str(self.path)
        }


class SkillsRegistry:
    """
    Registry for discovering skills in the filesystem.
    Follows the structure:
    skills/
      category/
        skill-name/
          SKILL.md
    """
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir

    def discover(self) -> List[Dict[str, Any]]:
        """
        Recursively discover skills.
        Returns a list of skill dictionaries.
        """
        skills = []
        
        if not self.root_dir.exists():
            print(f"⚠️ Skills directory not found: {self.root_dir}")
            return []

        # Walk through the skills directory
        for item in self.root_dir.rglob("SKILL.md"):
            skill_dir = item.parent
            category = skill_dir.parent.name
            
            # Skip if any part of the path starts with . or _
            if any(p.startswith(('.', '_')) for p in skill_dir.parts):
                continue

            metadata = self._parse_skill_md(item)
            if metadata:
                # Use directory name as ID if title isn't found or as fallback
                skill_id = skill_dir.name
                name = metadata.get("title", skill_id.replace("-", " ").title())
                description = metadata.get("description", "No description available.")
                
                skill = SkillMetadata(
                    id=skill_id,
                    name=name,
                    description=description,
                    category=category,
                    path=skill_dir
                )
                skills.append(skill.to_dict())
        
        # Sort by category then name
        skills.sort(key=lambda x: (x["category"], x["name"]))
        return skills

    def _parse_skill_md(self, file_path: Path) -> Optional[Dict[str, str]]:
        """
        Parse title and description from SKILL.md.
        Expects:
        # [Title]
        ... description ...
        """
        try:
            content = file_path.read_text(encoding="utf-8")
            lines = content.splitlines()
            metadata = {}
            
            # Find Title (first H1)
            for line in lines:
                if line.strip().startswith("# "):
                    metadata["title"] = line.strip()[2:].strip()
                    break
            
            # Find Description (first paragraph after title?) 
            # For now, let's just grab the title. 
            # Enhancment: Parse properly if frontmatter exists or specific format.
            return metadata
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return None


def get_skills_registry() -> SkillsRegistry:
    """Factory to get the registry instance"""
    # Assuming standard structure relative to project root
    # This file is in src/agents/
    # Project root is ../../
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    skills_dir = project_root / "skills"
    
    return SkillsRegistry(skills_dir)


def discover_skills() -> List[Dict[str, Any]]:
    """Public API to get all skills"""
    registry = get_skills_registry()
    return registry.discover()
