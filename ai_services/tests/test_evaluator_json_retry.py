import os
import sys
from unittest.mock import patch

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from agents.ai_evaluator import AIEvaluator  # noqa: E402

IDEAL_CHAIN = [{"action": "Triage alert"}]
ACTUAL_CHAIN = [{"action": "Triage alert"}]

VALID_JSON = (
    '{"detection_score": 80, "decision_score": 70, "response_score": 90, '
    '"feedback": "ok", "strengths": "ok", "improvements": "ok"}'
)


def test_evaluator_retries_on_broken_json_then_succeeds():
    """A malformed first response (prose, no JSON) should not fail the
    evaluation outright -- the evaluator should re-prompt and accept a
    valid response on a later attempt."""
    evaluator = AIEvaluator()
    responses = iter(["Sure, here is my evaluation: it went fine.", VALID_JSON])
    with patch.object(AIEvaluator, "call", side_effect=lambda *a, **k: next(responses)) as mock_call:
        result = evaluator.evaluate(IDEAL_CHAIN, ACTUAL_CHAIN, "medium")
    assert result["detection_score"] == 80
    assert mock_call.call_count == 2


def test_evaluator_retries_on_out_of_range_score_then_succeeds():
    """A structurally-valid JSON response with an out-of-spec score (e.g.
    150 instead of 0-100) should also trigger a retry, not just JSON
    parse failures."""
    evaluator = AIEvaluator()
    bad_json = VALID_JSON.replace('"detection_score": 80', '"detection_score": 150')
    responses = iter([bad_json, VALID_JSON])
    with patch.object(AIEvaluator, "call", side_effect=lambda *a, **k: next(responses)) as mock_call:
        result = evaluator.evaluate(IDEAL_CHAIN, ACTUAL_CHAIN, "medium")
    assert result["detection_score"] == 80
    assert mock_call.call_count == 2


def test_evaluator_gives_up_after_max_retries():
    """Persistent malformed responses should eventually raise instead of
    retrying forever."""
    evaluator = AIEvaluator()
    with patch.object(AIEvaluator, "call", return_value="still not json") as mock_call:
        try:
            evaluator.evaluate(IDEAL_CHAIN, ACTUAL_CHAIN, "medium")
            assert False, "expected ValueError"
        except ValueError:
            pass
    assert mock_call.call_count == AIEvaluator.MAX_JSON_RETRIES + 1


if __name__ == "__main__":
    test_evaluator_retries_on_broken_json_then_succeeds()
    test_evaluator_retries_on_out_of_range_score_then_succeeds()
    test_evaluator_gives_up_after_max_retries()
    print("OK")
