"""
Regression test for a race condition found in code review: OpenAIClient
used to stash token usage on `self.last_usage` (shared instance state),
read back separately by BaseAgent.call(). Since Commander/Mentor/Evaluator
are singletons each wrapping one shared OpenAIClient (see
backend/app/core/ai_bridge.py), and the backend runs concurrent requests
for different incidents on separate threads (FastAPI's run_in_threadpool),
one thread could overwrite `last_usage` before another thread read it for
its own log entry -- misattributing token counts between unrelated calls.

Fixed by having OpenAIClient.call() return (content, usage) directly
instead of stashing it as shared state. This test proves it: many threads
call the mocked client concurrently, each with a distinguishable usage
value baked into the mock response, and every thread must get back
exactly its own usage, never another thread's.

Uses a fake OpenAI client (no real API calls) so this is fast, free, and
deterministic -- unlike the other ai_services tests, this one is safe to
run automatically.
"""

import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import MagicMock, patch

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from utils.openai_client import OpenAIClient


def _fake_response(call_index: int):
    """Build a fake OpenAI response whose usage uniquely identifies which
    call produced it, with an artificial delay to widen the race window."""
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=f"response-{call_index}"))]
    response.usage = MagicMock(
        prompt_tokens=call_index,
        completion_tokens=call_index * 10,
        total_tokens=call_index * 11,
    )
    return response


def test_concurrent_calls_never_cross_contaminate_usage():
    client = OpenAIClient()

    def fake_create(*, model, messages, **kwargs):
        # Recover which logical call this is from the user message we
        # crafted below, and simulate network latency so overlapping
        # threads are likely if there's any shared mutable state.
        call_index = int(messages[1]["content"].split("-")[-1])
        threading.Event().wait(0.01)
        return _fake_response(call_index)

    with patch.object(client.client.chat.completions, "create", side_effect=fake_create):
        n = 50

        def do_call(i: int):
            content, usage = client.call("system prompt", f"call-{i}")
            return i, content, usage

        results = []
        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = [pool.submit(do_call, i) for i in range(n)]
            for future in as_completed(futures):
                results.append(future.result())

        assert len(results) == n
        for i, content, usage in results:
            assert content == f"response-{i}"
            assert usage == {
                "prompt_tokens": i,
                "completion_tokens": i * 10,
                "total_tokens": i * 11,
                "model": client.model,
            }, f"call {i} got mismatched usage {usage} -- cross-contamination from another thread"


if __name__ == "__main__":
    test_concurrent_calls_never_cross_contaminate_usage()
    print("Thread-safety test passed: no cross-contamination across 50 concurrent calls.")
