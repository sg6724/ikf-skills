"""Sidebar component for FastHTML frontend"""
from fasthtml.common import *


def Sidebar():
    """
    Sidebar component with navigation and conversation controls.
    """
    from src.agents import discover_skills
    
    # Get available skills (agents)
    skills = discover_skills()
    
    return Div(
        # Header with logo
        Div(
            H2(
                Span("✨", style="font-size: 18px;"), 
                " IKF AI Skills Playground",
                cls="sidebar-title"
            ),
            Button(
                Span("+", style="font-size: 16px; font-weight: 500;"), 
                " New Task",
                cls="new-tasks-btn",
                onclick="window.location.reload();"
            ),
            cls="sidebar-header"
        ),
        
        # Navigation
        Div(
            H3(
                "Skill Library", 
                cls="sidebar-section-title"
            ),
            Div(
                *[
                    Div(
                        Span("⚡", cls="nav-icon"), 
                        skill["name"],
                        cls="nav-item",
                        title=skill["description"]
                    ) for skill in skills
                ],
                cls="sidebar-nav"
            ),
            cls="sidebar-nav-container"
        ),
        
        # Recents section
        Div(
            H3(
                "Recents", 
                cls="sidebar-section-title"
            ),
            Div(
                Span("💬", cls="nav-icon"), 
                "Current Conversation",
                cls="nav-item active"
            ),
            cls="sidebar-nav-container"
        ),
        
        cls="sidebar"
    )
