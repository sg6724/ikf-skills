"""Filesystem paths shared by backend modules."""

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = REPO_ROOT / "src" / "backend"
ARTIFACTS_DIR = REPO_ROOT / "artifacts"
HARNESS_ROOT = BACKEND_ROOT / "agents" / "harness"
HARNESS_TMP_DIR = HARNESS_ROOT / "tmp"

