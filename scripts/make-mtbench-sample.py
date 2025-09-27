"""Generate a compact MT-Bench sample for demo seeding.

If the `datasets` library is available, pull a random subset from
`lmsys/mt_bench_human_judgments`. Otherwise fall back to a small built-in
sample so the demo continues to work in offline environments.
"""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Iterable

MAX_CHARS = 1500
SAMPLE_SIZE = 120
OUTPUT_PATH = Path(__file__).with_name("mtbench_sample.json")

try:
    from datasets import load_dataset  # type: ignore
except Exception:  # pragma: no cover - offline fallback
    load_dataset = None

FALLBACK_ROWS = [
    {
        "id": 1,
        "prompt": "Describe how photosynthesis works in simple terms.",
        "optionA": "Photosynthesis is the process by which plants take in carbon dioxide and water and, using sunlight, convert them into glucose and oxygen. This happens mainly in the leaves in structures called chloroplasts.",
        "optionB": "Plants eat sunlight directly using their roots, then breathe out water into the air. The more sun they eat, the happier they get.",
        "gold": "A",
    },
    {
        "id": 2,
        "prompt": "Give two tips for staying productive while working remotely.",
        "optionA": "Set a dedicated workspace free from distractions and keep a consistent schedule with planned breaks to maintain focus.",
        "optionB": "Always keep your TV on in the background for company and only work when inspiration strikes, even if that means 3 AM.",
        "gold": "A",
    },
    {
        "id": 3,
        "prompt": "Explain the difference between supervised and unsupervised learning.",
        "optionA": "Supervised learning trains on labelled data where each example has a known target, whereas unsupervised learning looks for patterns in unlabelled data.",
        "optionB": "Supervised learning happens when an AI has a human boss watching every move, and unsupervised is when the AI goes rogue and teaches itself anything.",
        "gold": "A",
    },
]


def clean_text(value: str | None) -> str | None:
    if not value:
        return None
    text = value.strip()
    return text if text else None


def build_sample_from_dataset() -> list[dict[str, object]]:
    dataset = load_dataset("lmsys/mt_bench_human_judgments", split="human")

    rows: list[dict[str, object]] = []
    for example in dataset:
        # Extract the first turn of conversation as the prompt and responses
        conv_a = example.get("conversation_a", [])
        conv_b = example.get("conversation_b", [])

        if not conv_a or not conv_b or len(conv_a) == 0 or len(conv_b) == 0:
            continue

        # Get the user's question (should be the same in both conversations)
        prompt = clean_text(conv_a[0].get("content") if conv_a[0].get("role") == "user" else None)

        # Get the assistant responses (should be the second message in each conversation)
        option_a = clean_text(conv_a[1].get("content") if len(conv_a) > 1 and conv_a[1].get("role") == "assistant" else None)
        option_b = clean_text(conv_b[1].get("content") if len(conv_b) > 1 and conv_b[1].get("role") == "assistant" else None)

        if not prompt or not option_a or not option_b:
            continue
        if len(option_a) > MAX_CHARS or len(option_b) > MAX_CHARS:
            continue

        # Map winner to A/B format
        winner = example.get("winner")
        gold = "A" if winner == "model_a" else "B" if winner == "model_b" else None

        rows.append(
            {
                "id": example.get("question_id", len(rows)),
                "prompt": prompt,
                "optionA": option_a,
                "optionB": option_b,
                "gold": gold,
            }
        )

    random.seed(7)
    random.shuffle(rows)
    return rows[:SAMPLE_SIZE]


def main() -> None:
    if load_dataset is not None:
        try:
            rows = build_sample_from_dataset()
        except Exception:  # pragma: no cover - fallback path
            rows = FALLBACK_ROWS
    else:
        rows = FALLBACK_ROWS

    OUTPUT_PATH.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {len(rows)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
