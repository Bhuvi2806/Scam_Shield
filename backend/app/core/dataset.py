"""Dataset loader and validation utilities for patterns and evaluation data."""

import json
from pathlib import Path

from app.schemas.dataset import Pattern, TestMessage

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DEFAULT_PATTERNS_PATH = DATA_DIR / "patterns.json"
DEFAULT_TEST_SET_PATH = DATA_DIR / "test_set.json"


def load_patterns(path: Path | str | None = None) -> list[Pattern]:
    """Load and validate scam detection patterns from a JSON file.

    Args:
        path: Optional file path. Defaults to backend/data/patterns.json.

    Returns:
        List of validated Pattern models.

    Raises:
        FileNotFoundError: If the pattern file does not exist.
        ValueError: If JSON is invalid or fails schema validation.
    """
    file_path = Path(path) if path else DEFAULT_PATTERNS_PATH
    if not file_path.exists():
        raise FileNotFoundError(f"Patterns file not found at: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    if not isinstance(raw_data, list):
        raise TypeError("Patterns JSON root must be a list")

    return [Pattern(**item) for item in raw_data]


def load_test_set(path: Path | str | None = None) -> list[TestMessage]:
    """Load and validate evaluation test set messages from a JSON file.

    Args:
        path: Optional file path. Defaults to backend/data/test_set.json.

    Returns:
        List of validated TestMessage models.

    Raises:
        FileNotFoundError: If the test set file does not exist.
        ValueError: If JSON is invalid or fails schema validation.
    """
    file_path = Path(path) if path else DEFAULT_TEST_SET_PATH
    if not file_path.exists():
        raise FileNotFoundError(f"Test set file not found at: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    if not isinstance(raw_data, list):
        raise TypeError("Test set JSON root must be a list")

    return [TestMessage(**item) for item in raw_data]
