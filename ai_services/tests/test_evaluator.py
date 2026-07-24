import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from agents.ai_evaluator import AIEvaluator


def test_evaluator():
    evaluator = AIEvaluator()
    ideal_chain = [
        {"action": "Triage alert"},
        {"action": "Check timeline"},
        {"action": "Correlate logs"},
        {"action": "Assess impact"},
        {"action": "Respond"},
    ]
    actual_chain = [
        {"action": "Triage alert"},
        {"action": "Checked email logs"},
        {"action": "Escalated"},
    ]
    result = evaluator.evaluate(ideal_chain, actual_chain, "medium")
    print(f"Evaluation: {result}")
    assert "detection_score" in result
    assert "feedback" in result


if __name__ == "__main__":
    test_evaluator()
