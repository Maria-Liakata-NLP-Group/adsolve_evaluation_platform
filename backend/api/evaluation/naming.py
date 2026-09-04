"""Derives the metric API's run name from a free-text run title.

The metric API requires `name` to match ^[a-z][a-z0-9_]*$ — it becomes the bundle
spec name and the generated script's filename. Run titles are free text, so the
conversion happens here rather than being pushed onto the user.
"""

from __future__ import annotations

import re

FALLBACK_NAME = "run"


def to_run_name(title: str) -> str:
    """Convert a run title into a lowercase snake_case identifier."""
    # Whitespace becomes the word separator; anything else outside the
    # pattern is dropped rather than converted, so "GPT-4" reads as "gpt4".
    separated = re.sub(r"\s+", "_", title.strip().lower())
    cleaned = re.sub(r"[^a-z0-9_]", "", separated)
    collapsed = re.sub(r"_+", "_", cleaned).strip("_")

    if not collapsed:
        return FALLBACK_NAME
    # A leading digit is invalid, so keep the title and prefix it.
    if collapsed[0].isdigit():
        return f"{FALLBACK_NAME}_{collapsed}"
    return collapsed
