"""
Agent Factory Module

Creates the IKF Harness Agent for use in the backend API.
This module handles path configuration and imports from the harness agent.
"""

import sys
from pathlib import Path

# Add harness directory to path for imports
HARNESS_DIR = Path(__file__).resolve().parent.parent / "agents" / "harness"
if str(HARNESS_DIR) not in sys.path:
    sys.path.insert(0, str(HARNESS_DIR))

# Import the agent creator from harness
from agent import create_agent as _create_harness_agent


def create_agent():
    """
    Create and return the IKF Harness Agent configured for backend use.
    
    The harness agent is the "universal" agent that can assume any domain
    expert role based on the user's request.
    """
    agent = _create_harness_agent()
    # Ensure the agent has an ID for AgentOS
    agent.agent_id = "ikf-harness"
    return agent


# Export for use by main.py
__all__ = ["create_agent"]
