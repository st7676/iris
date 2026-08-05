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


def test_commander_reacts_differently_to_fast_vs_slow_investigation():
    """
    Day 18 (Markeriot sprint): the narrative should feel live and reactive,
    not templated -- a fast correct check and a slow/wrong one should
    produce meaningfully different updates, not the same boilerplate.
    """
    commander = AICommander()
    fast_update = commander.generate_update(
        {"scenario_id": "silent_login_v1", "severity": "low", "alert_message": "Unusual login activity detected."},
        "checked auth logs within 45 seconds of the alert",
    )
    slow_update = commander.generate_update(
        {"scenario_id": "silent_login_v1", "severity": "high", "alert_message": "Unusual login activity detected."},
        "checked email logs, several minutes after the alert, missing the auth logs",
    )
    print(f"Fast: {fast_update}")
    print(f"Slow: {slow_update}")
    assert fast_update.strip().lower() != slow_update.strip().lower()


if __name__ == "__main__":
    test_commander()
    test_commander_reacts_differently_to_fast_vs_slow_investigation()
