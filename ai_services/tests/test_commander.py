import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from agents.ai_commander import AICommander


def test_commander():
    commander = AICommander()
    update = commander.generate_update(
        {
            "scenario_id": "silent_login_v1",
            "severity": "medium",
            "alert_message": "Unusual login activity detected",
        },
        "User checked email logs",
    )
    print(f"Update: {update}")
    assert len(update) > 0


if __name__ == "__main__":
    test_commander()
