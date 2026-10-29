"""Tests for scam patterns and evaluation test set integrity and schema validation."""

import re

from app.core.dataset import load_patterns, load_test_set
from app.schemas.dataset import VALID_SCAM_TYPES


def test_patterns_load_and_validate():
    """Patterns file loads cleanly and has at least 30 validated patterns."""
    patterns = load_patterns()
    assert len(patterns) >= 30, f"Expected at least 30 patterns, found {len(patterns)}"


def test_pattern_ids_are_unique():
    """Each pattern must have a unique ID."""
    patterns = load_patterns()
    ids = [p.id for p in patterns]
    duplicates = [pid for pid in ids if ids.count(pid) > 1]
    assert len(ids) == len(set(ids)), f"Duplicate pattern IDs found: {set(duplicates)}"


def test_patterns_cover_all_scam_types():
    """All 7 supported scam types must be represented across the pattern set."""
    patterns = load_patterns()
    found_types = {p.scam_type for p in patterns}
    missing_types = VALID_SCAM_TYPES - found_types
    assert not missing_types, f"Patterns missing scam types: {missing_types}"


def test_pattern_regexes_compile():
    """All regular expressions in patterns must compile cleanly."""
    patterns = load_patterns()
    for pattern in patterns:
        for r in pattern.regexes:
            try:
                re.compile(r)
            except re.error as e:
                raise AssertionError(f"Pattern {pattern.id} has invalid regex '{r}': {e}") from e


def test_pattern_weights_valid():
    """All pattern weights must be between 1 and 5 inclusive."""
    patterns = load_patterns()
    for pattern in patterns:
        assert 1 <= pattern.weight <= 5, f"Pattern {pattern.id} has invalid weight {pattern.weight}"


def test_test_set_loads_and_has_minimum_counts():
    """Test set loads cleanly and contains at least 30 scam and 30 genuine messages (>= 60 total)."""
    messages = load_test_set()
    assert len(messages) >= 60, f"Expected at least 60 messages, found {len(messages)}"

    scam_count = sum(1 for m in messages if m.label == "scam")
    genuine_count = sum(1 for m in messages if m.label == "genuine")

    assert scam_count >= 30, f"Expected at least 30 scam messages, found {scam_count}"
    assert genuine_count >= 30, f"Expected at least 30 genuine messages, found {genuine_count}"


def test_test_set_message_ids_are_unique():
    """Each test message must have a unique ID."""
    messages = load_test_set()
    ids = [m.id for m in messages]
    duplicates = [mid for mid in ids if ids.count(mid) > 1]
    assert len(ids) == len(set(ids)), f"Duplicate message IDs found: {set(duplicates)}"


def test_test_set_covers_all_languages():
    """Test set must contain English, Hindi, and Hinglish messages."""
    messages = load_test_set()
    languages = {m.language for m in messages}
    expected_languages = {"en", "hi", "hinglish"}
    assert expected_languages.issubset(languages), f"Missing languages: {expected_languages - languages}"


def test_test_set_scam_types_and_labels_consistency():
    """Every scam message must have a valid scam_type; every genuine message must have None."""
    messages = load_test_set()
    scam_types_in_test_set = set()

    for m in messages:
        if m.label == "scam":
            assert m.scam_type is not None, f"Scam message {m.id} has no scam_type"
            assert m.scam_type in VALID_SCAM_TYPES, f"Scam message {m.id} has invalid scam_type: {m.scam_type}"
            scam_types_in_test_set.add(m.scam_type)
        else:
            assert m.scam_type is None, f"Genuine message {m.id} should have scam_type=None, got {m.scam_type}"

    missing_scam_types = VALID_SCAM_TYPES - scam_types_in_test_set
    assert not missing_scam_types, f"Scam test set missing representations for: {missing_scam_types}"
