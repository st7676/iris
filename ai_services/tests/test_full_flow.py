import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from agents.ai_commander import AICommander
from agents.ai_evaluator import AIEvaluator
from agents.ai_mentor import AIMentor


def test_full_incident_flow():
    mock_incident = {
        "scenario_id": "silent_login_v1",
        "severity": "medium",
        "alert_message": "Unusual login activity detected",
    }

    # 1. Commander: initial alert / update
    commander = AICommander()
    update1 = commander.generate_update(mock_incident, "started")
    print(f"Commander: {update1}")
    assert len(update1) > 0

    # 2. Mentor: hint when user is stuck
    mentor = AIMentor()
    hint = mentor.provide_hint("What should I check?", mock_incident, ["started"])
    print(f"Mentor: {hint}")
    assert len(hint) > 0

    # 3. Evaluator: score at the end
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
    score = evaluator.evaluate(ideal_chain, actual_chain, "medium")
    print(f"Evaluator: {score}")
    assert "detection_score" in score
    assert "feedback" in score


if __name__ == "__main__":
    test_full_incident_flow()
    print("\nFull flow test passed.")
