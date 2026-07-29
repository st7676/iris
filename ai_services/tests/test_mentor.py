import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from agents.ai_mentor import AIMentor


def test_mentor():
    mentor = AIMentor()
    hint = mentor.provide_hint(
        "What should I check?",
        {
            "scenario_id": "silent_login_v1",
            "severity": "medium",
            "alert_message": "Unusual login activity detected",
        },
        ["started", "checked email logs"],
    )
    print(f"Hint: {hint}")
    assert len(hint) > 0


if __name__ == "__main__":
    test_mentor()
