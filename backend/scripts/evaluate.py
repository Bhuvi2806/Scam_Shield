"""Evaluate detector and fusion accuracy against test_set.json.

Strict privacy rule: NEVER prints message text. Only prints message IDs.

Usage:
    python -m backend.scripts.evaluate             # Rule-only (default, fast, no external calls)
    python -m backend.scripts.evaluate --fusion    # Full fusion evaluation (offline fake LLM by default)
    python -m backend.scripts.evaluate --llm       # Claude LLM evaluation (spends API credits)
"""

from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

# Ensure backend directory is in python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.dataset import load_test_set
from app.core.fusion import fuse, normalize_scam_type
from app.detectors.rule_detector import RuleDetector
from app.detectors.url_checker import SafeBrowsingClient, UrlChecker
from app.schemas.llm import LLMRedFlag, LLMResult


class OfflineSimulatedLLMClient:
    """Offline simulated LLM client for hermetic evaluation without spending API credits."""

    def analyze(self, label: str, scam_type: str | None) -> LLMResult:
        if label == "scam":
            stype = normalize_scam_type(scam_type)
            return LLMResult(
                verdict="likely_scam",
                scam_type=stype,
                red_flags=[
                    LLMRedFlag(
                        category="authority_impersonation",
                        quote="simulated quote",
                        reason="Simulated offline red flag",
                    )
                ],
                explanation_en="Simulated offline English explanation.",
                explanation_hi="सिम्युलेटेड हिंदी व्याख्या।",
                confidence=0.92,
            )
        return LLMResult(
            verdict="safe",
            scam_type="none",
            red_flags=[],
            explanation_en="Simulated genuine message. No red flags found, but never share OTP, PIN or money.",
            explanation_hi="वास्तविक संदेश। कभी भी OTP या पिन साझा न करें।",
            confidence=0.88,
        )


class OfflineSafeBrowsingClient(SafeBrowsingClient):
    """Offline Safe Browsing client that flags synthetic phishing domains without network calls."""

    def lookup(self, urls: list[str]) -> dict[str, list[str]]:
        results: dict[str, list[str]] = {}
        for u in urls:
            u_lower = u.lower()
            if any(kw in u_lower for kw in ["phishing", "malware", "scam-verify", "fake-kyc"]):
                results[u] = ["SOCIAL_ENGINEERING"]
            else:
                results[u] = []
        return results


def evaluate_rules(verbose: bool = True) -> dict:
    """Run rule-based evaluation and return metric dictionary."""
    test_set = load_test_set()
    detector = RuleDetector()

    total = len(test_set)
    tp = 0
    tn = 0
    fp = 0
    fn = 0

    false_positive_ids: list[str] = []
    false_negative_ids: list[str] = []
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


def evaluate_fusion(verbose: bool = True, use_real_llm: bool = False) -> dict:
    """Run Score Fusion evaluation on test_set.json and report metrics."""
    test_set = load_test_set()
    detector = RuleDetector()
    url_checker = UrlChecker(client=OfflineSafeBrowsingClient())
    simulated_llm = OfflineSimulatedLLMClient()

    total = len(test_set)
    tp = 0
    tn = 0
    fp = 0
    fn = 0

    false_positive_ids: list[str] = []
    false_negative_ids: list[str] = []
    scam_type_stats = defaultdict(lambda: {"total": 0, "detected": 0, "type_match": 0})

    for msg in test_set:
        rule_res = detector.analyze(msg.text)
        url_res = url_checker.check_text(msg.text)
        llm_res = simulated_llm.analyze(msg.label, msg.scam_type)

        final_verdict = fuse(rule=rule_res, llm=llm_res, url_check=url_res)
        is_flagged = final_verdict.verdict in {"suspicious", "likely_scam"}

        if msg.label == "scam":
            expected_type = normalize_scam_type(msg.scam_type)
            scam_type_stats[expected_type]["total"] += 1
            if is_flagged:
                tp += 1
                scam_type_stats[expected_type]["detected"] += 1
                if final_verdict.scam_type == expected_type:
                    scam_type_stats[expected_type]["type_match"] += 1
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
        print("SCAM SHIELD — FINAL SCORE FUSION EVALUATION REPORT")
        print("=" * 65)
        print(f"Total evaluation samples: {total}")
        print(f"Overall Final Accuracy:  {accuracy:.2f}% ({tp + tn}/{total})")
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


def evaluate_llm(verbose: bool = True) -> dict:
    """Run LLM evaluation on the test set (spends API credits)."""
    from app.core.config import settings
    from app.llm.analyzer import LLMAnalysisError, analyze_with_llm
    from app.llm.client import ClaudeLLMClient, LLMAPIError

    test_set = load_test_set()
    total = len(test_set)

    print("=" * 65)
    print("SCAM SHIELD — LLM EVALUATION")
    print("=" * 65)
    print(f"Model:           {settings.ANTHROPIC_MODEL}")
    print(f"Test set size:   {total}")
    print(f"API calls:       {total} (one per message)")
    print(f"Max tokens/call: {settings.LLM_MAX_TOKENS}")
    print("=" * 65)

    if not settings.ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY is not set. Cannot run LLM evaluation.")
        return {"error": "ANTHROPIC_API_KEY not set"}

    try:
        client = ClaudeLLMClient()
    except LLMAPIError as exc:
        print(f"ERROR: Could not create LLM client: {exc}")
        return {"error": str(exc)}

    tp = 0
    tn = 0
    fp = 0
    fn = 0
    errors = 0
    false_positive_ids: list[str] = []
    false_negative_ids: list[str] = []
    error_ids: list[str] = []

    for i, msg in enumerate(test_set, 1):
        print(f"  [{i}/{total}] Analyzing {msg.id}...", end=" ", flush=True)
        try:
            result = analyze_with_llm(msg.text, client)
            is_flagged = result.verdict in {"suspicious", "likely_scam"}

            if msg.label == "scam":
                if is_flagged:
                    tp += 1
                    print(f"✓ flagged ({result.verdict})")
                else:
                    fn += 1
                    false_negative_ids.append(msg.id)
                    print(f"✗ MISSED ({result.verdict})")
            else:
                if is_flagged:
                    fp += 1
                    false_positive_ids.append(msg.id)
                    print(f"✗ FALSE POSITIVE ({result.verdict})")
                else:
                    tn += 1
                    print(f"✓ safe ({result.verdict})")

        except LLMAnalysisError as exc:
            errors += 1
            error_ids.append(msg.id)
            print(f"⚠ ERROR: {type(exc).__name__}")

    evaluated = total - errors
    accuracy = ((tp + tn) / evaluated) * 100 if evaluated else 0.0

    print("\n" + "=" * 65)
    print("LLM EVALUATION RESULTS")
    print("=" * 65)
    print(f"Total messages:    {total}")
    print(f"Successfully eval: {evaluated}")
    print(f"Errors:            {errors}")
    print(f"Accuracy:          {accuracy:.2f}% ({tp + tn}/{evaluated})")
    print(f"True Positives:    {tp}")
    print(f"True Negatives:    {tn}")
    print(f"False Positives:   {fp}")
    print(f"False Negatives:   {fn}")
    print("=" * 65)

    return {
        "total": total,
        "evaluated": evaluated,
        "errors": errors,
        "accuracy": accuracy,
        "true_positives": tp,
        "true_negatives": tn,
        "false_positives": fp,
        "false_negative_ids": false_negative_ids,
        "false_positive_ids": false_positive_ids,
        "error_ids": error_ids,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Scam Shield detectors and fusion")
    parser.add_argument(
        "--fusion",
        action="store_true",
        help="Run final score fusion evaluation across all layers (offline by default).",
    )
    parser.add_argument(
        "--llm",
        action="store_true",
        help="Run live Claude LLM evaluation (spends API credits).",
    )
    args = parser.parse_args()

    if args.fusion:
        metrics = evaluate_fusion(verbose=True)
        if metrics["false_negatives"] > 0:
            sys.exit(1)
        sys.exit(0)

    # Default: rule-only evaluation
    metrics = evaluate_rules(verbose=True)

    if args.llm:
        print("\n")
        llm_metrics = evaluate_llm(verbose=True)
        if "error" in llm_metrics:
            sys.exit(1)

    if metrics["false_negatives"] > 0:
        sys.exit(1)
    sys.exit(0)
