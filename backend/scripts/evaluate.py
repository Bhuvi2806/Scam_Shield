"""Evaluate rule-based detector accuracy, false positives, and false negatives against test_set.json.

Strict privacy rule: NEVER prints message text. Only prints message IDs.
"""

import sys
from collections import defaultdict
from pathlib import Path

# Ensure backend directory is in python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.dataset import load_test_set
from app.detectors.rule_detector import RuleDetector


def evaluate(verbose: bool = True) -> dict:
    """Run evaluation and return metric dictionary."""
    test_set = load_test_set()
    detector = RuleDetector()

    total = len(test_set)
    tp = 0  # Scam correctly identified as suspicious or likely_scam
    tn = 0  # Genuine correctly identified as safe
    fp = 0  # Genuine incorrectly flagged as suspicious or likely_scam
    fn = 0  # Scam incorrectly marked safe

    false_positive_ids: list[str] = []
    false_negative_ids: list[str] = []

    # Per-scam-type metrics
    scam_type_stats = defaultdict(lambda: {"total": 0, "detected": 0, "type_match": 0})

    for msg in test_set:
        result = detector.analyze(msg.text)
        is_flagged = result.verdict in {"suspicious", "likely_scam"}

        if msg.label == "scam":
            scam_type = msg.scam_type or "unknown"
            scam_type_stats[scam_type]["total"] += 1
            if is_flagged:
                tp += 1
                scam_type_stats[scam_type]["detected"] += 1
                if result.scam_type_guess == scam_type:
                    scam_type_stats[scam_type]["type_match"] += 1
            else:
                fn += 1
                false_negative_ids.append(msg.id)
        else:
            if is_flagged:
                fp += 1
                false_positive_ids.append(msg.id)
            else:
                tn += 1

    accuracy = ((tp + tn) / total) * 100 if total else 0.0

    if verbose:
        print("=" * 65)
        print("SCAM SHIELD — RULE DETECTOR EVALUATION REPORT")
        print("=" * 65)
        print(f"Total evaluation samples: {total}")
        print(f"Overall Accuracy:        {accuracy:.2f}% ({tp + tn}/{total})")
        print(f"True Positives (Scam):   {tp}")
        print(f"True Negatives (Safe):   {tn}")
        print(f"False Positives:         {fp}")
        print(f"False Negatives:         {fn}")
        print("-" * 65)

        if false_negative_ids:
            print(f"FALSE NEGATIVE IDs: {false_negative_ids}")
        else:
            print("FALSE NEGATIVE IDs: None (Zero false negatives!)")

        if false_positive_ids:
            print(f"FALSE POSITIVE IDs: {false_positive_ids}")
        else:
            print("FALSE POSITIVE IDs: None (Zero false positives!)")

        print("-" * 65)
        print("PER-SCAM-TYPE BREAKDOWN (Scam Samples Only):")
        print(f"{'Scam Type':<25} {'Total':<8} {'Detected':<10} {'Type Match':<12} {'Recall':<8}")
        print("-" * 65)
        for stype, stats in sorted(scam_type_stats.items()):
            recall = (stats["detected"] / stats["total"]) * 100 if stats["total"] else 0.0
            type_acc = (stats["type_match"] / stats["total"]) * 100 if stats["total"] else 0.0
            print(
                f"{stype:<25} {stats['total']:<8} {stats['detected']:<10} "
                f"{stats['type_match']:<12} ({type_acc:.0f}%) {recall:.1f}%"
            )
        print("=" * 65)

    return {
        "total": total,
        "accuracy": accuracy,
        "true_positives": tp,
        "true_negatives": tn,
        "false_positives": fp,
        "false_negatives": fn,
        "false_positive_ids": false_positive_ids,
        "false_negative_ids": false_negative_ids,
        "per_scam_type": dict(scam_type_stats),
    }


if __name__ == "__main__":
    metrics = evaluate(verbose=True)
    if metrics["false_negatives"] > 0:
        sys.exit(1)
    sys.exit(0)
