"""
Day 20-21 (Markeriot sprint): repeatable latency/consistency benchmark.
Not wired into pytest (ai_services has no pytest.ini and this makes many
paid live calls) -- run manually before a pitch/rehearsal:

    python tests/test_latency_benchmark.py

Results as of the Day 20-21 sprint run are documented in README.md's
Performance section.
"""

import os
import statistics
import sys
import time

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from agents.ai_commander import AICommander
from agents.ai_evaluator import AIEvaluator
from agents.ai_mentor import AIMentor

TARGET_SECONDS = 3.0


def _summarize(label: str, times: list[float]) -> None:
    under_target = sum(1 for t in times if t < TARGET_SECONDS)
    p95 = sorted(times)[max(0, int(len(times) * 0.95) - 1)]
    print(
        f"{label:<22} min={min(times):.2f}s mean={statistics.mean(times):.2f}s "
        f"p95={p95:.2f}s max={max(times):.2f}s under_{TARGET_SECONDS:.0f}s={under_target}/{len(times)}"
    )


def run_benchmark(n: int = 12) -> None:
    commander = AICommander()
    mentor = AIMentor()
    evaluator = AIEvaluator()

    commander_times, mentor_times, evaluator_times = [], [], []
    errors = 0

    print(f"Running {n} calls per agent ({n * 3} total, live API)...")
    for _ in range(n):
        for label, times, fn in (
            (
                "commander",
                commander_times,
                lambda: commander.generate_update(
                    {"scenario_id": "silent_login_v1", "severity": "medium", "alert_message": "test"},
                    "checked auth logs",
                ),
            ),
            (
                "mentor",
                mentor_times,
                lambda: mentor.provide_hint(
                    "What should I check next?",
                    {"scenario_id": "silent_login_v1", "severity": "medium"},
                    ["checked email logs"],
                ),
            ),
            (
                "evaluator",
                evaluator_times,
                lambda: evaluator.evaluate(
                    [{"action": "check_email_logs"}, {"action": "check_auth_logs"}, {"action": "escalate_to_soc_lead"}],
                    [{"action": "check_email_logs"}, {"action": "escalate_to_soc_lead"}],
                    "medium",
                ),
            ),
        ):
            try:
                start = time.perf_counter()
                fn()
                times.append(time.perf_counter() - start)
            except Exception as exc:
                errors += 1
                print(f"  {label} call FAILED: {exc}")

    print()
    print(f"Errors: {errors}/{n * 3} calls")
    _summarize("Commander", commander_times)
    _summarize("Mentor (/hint)", mentor_times)
    _summarize("Evaluator (/complete)", evaluator_times)


if __name__ == "__main__":
    run_benchmark()
