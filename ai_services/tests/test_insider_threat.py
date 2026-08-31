"""
Day 16-17 (Markeriot sprint): verify the three agents work for the new
insider_threat_v1 scenario, not just silent_login_v1. Action names match
what Dev1's ideal_reasoning_chain is expected to use (see
IRIS_Dev3_AI_Sprint.pdf): check_file_access_logs, check_usb_device_logs,
check_hr_status, revoke_access.
"""

import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from agents.ai_commander import AICommander
from agents.ai_evaluator import AIEvaluator
from agents.ai_mentor import AIMentor

INCIDENT_CONTEXT = {
    "scenario_id": "insider_threat_v1",
    "severity": "medium",
    "alert_message": "Departing employee accessed sensitive files outside business hours.",
}

IDEAL_CHAIN = [
    {"step": 1, "action": "check_file_access_logs", "rationale": "Identify what was accessed"},
    {"step": 2, "action": "check_usb_device_logs", "rationale": "Check for data exfiltration via USB"},
    {"step": 3, "action": "check_hr_status", "rationale": "Confirm the departure that motivated the access"},
    {"step": 4, "action": "revoke_access", "rationale": "Contain by revoking access immediately"},
]


def test_commander_narrates_insider_threat():
    commander = AICommander()
    update = commander.generate_update(INCIDENT_CONTEXT, "checked file access logs")
    print(f"Commander: {update}")
    assert len(update) > 0
    # Sanity check it isn't reusing Silent Login vocabulary for this scenario.
    lowered = update.lower()
    assert "phishing" not in lowered and "email" not in lowered


def test_mentor_hint_does_not_leak_solution_for_insider_threat():
    mentor = AIMentor()
    hint = mentor.provide_hint(
        "What should I check next?",
        INCIDENT_CONTEXT,
        ["check_file_access_logs"],
    )
    print(f"Mentor: {hint}")
    assert len(hint) > 0
    # The hint must not just hand over the next ideal-chain action verbatim.
    assert "check_usb_device_logs" not in hint.lower().replace(" ", "_")


def test_evaluator_handles_insider_threat_action_names():
    evaluator = AIEvaluator()
    actual_chain = [
        {"step": 1, "action": "check_file_access_logs"},
        {"step": 2, "action": "revoke_access"},
    ]
    result = evaluator.evaluate(IDEAL_CHAIN, actual_chain, "high")
    print(f"Evaluator: {result}")
    assert "detection_score" in result
    assert "feedback" in result


if __name__ == "__main__":
    test_commander_narrates_insider_threat()
    test_mentor_hint_does_not_leak_solution_for_insider_threat()
    test_evaluator_handles_insider_threat_action_names()
    print("\nInsider Threat prompt tests passed.")
