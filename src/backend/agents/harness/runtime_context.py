"""
Request-scoped runtime context for harness tool execution.
ContextVars are used so concurrent requests do not share artifact routing state.
"""

from contextvars import ContextVar
from pathlib import Path


current_conversation_id: ContextVar[str | None] = ContextVar(
    "current_conversation_id",
    default=None,
)
current_artifact_dir: ContextVar[Path | None] = ContextVar(
    "current_artifact_dir",
    default=None,
)
current_artifact_run_id: ContextVar[str | None] = ContextVar(
    "current_artifact_run_id",
    default=None,
)

