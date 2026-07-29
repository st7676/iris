# IRIS AI Services

The AI + Integration layer for IRIS: three OpenAI-backed agents (Commander, Mentor,
Evaluator) that drive the incident simulation.

## Running locally

```bash
cd ai_services
pip install -r requirements.txt
cp .env.example .env   # fill in OPENAI_API_KEY
python main.py          # standalone FastAPI service on http://localhost:8001
```

Or run agents directly without FastAPI, e.g. `python tests/test_full_flow.py`.

## Models supported

Any OpenAI chat-completion model, set via `OPENAI_MODEL` in `.env` (default `gpt-4o`).
If latency is an issue, switch to `gpt-3.5-turbo` (cheaper, faster, lower quality).

## Tuning prompts

Each agent's system prompt lives in `prompts/<agent>.py`. Keep prompts short and
focused (~200 tokens) — long prompts make model behavior less predictable. Each
agent has exactly one job:

- **Commander** (`prompts/commander.py`): narrates the incident, 1-2 sentences per update.
- **Mentor** (`prompts/mentor.py`): gives hints, never the answer.
- **Evaluator** (`prompts/evaluator.py`): scores the user's investigation as JSON.

Note: models sometimes wrap JSON responses in ` ```json ` fences despite instructions
not to. `AIEvaluator._strip_markdown_fence` handles this before parsing.

## Cost estimates

At `gpt-4o` pricing, a full simulation (1 commander update + 1-2 mentor hints + 1
evaluator call) runs well under $0.10 per session (~500 max_tokens per call).

## Backend integration

The Backend (`backend/`) does **not** call this as a separate HTTP service — it
imports the agent classes in-process, via `backend/app/core/ai_bridge.py`, per the
"AI Agent Functions (importable Python modules)" deliverable in
`IRIS_Team_Workflow.md`. `ai_bridge.py` locates `ai_services/` either via the
`AI_SERVICES_PATH` env var (set in Docker, where this folder is copied to a fixed
path in the image) or by walking up from its own location looking for a sibling
`ai_services/agents/` directory (works for a local checkout / `pytest` run).

Integration points wired into the Backend:

| Backend endpoint | Agent |
|---|---|
| `WS /ws/incidents/{id}` | `AICommander.generate_update` |
| `POST /api/incidents/{id}/hint` | `AIMentor.provide_hint` |
| `POST /api/incidents/{id}/complete` | `AIEvaluator.evaluate` |

`AIEvaluator.evaluate` compares `scenarios.ideal_reasoning_chain` (MongoDB) against
the incident's `action_log`, which the Backend maps into the same `{step, action}`
shape via `app/simulation/engine.py::build_actual_chain` before calling it.

## Observability

Every agent call is logged as a JSON line to `ai_services/logs/ai_calls.log`
(agent name, full system prompt, full user message, response, timestamp) — wired
into `BaseAgent.call()`, so all three agents get it automatically. This directory is
gitignored (incident content may end up in there, and it's local debugging data,
not something to commit).

## Security: prompt-injection guardrail

`utils/guardrails.py::sanitize_user_input` truncates (500 chars) and neutralizes
common "ignore your instructions" / "reveal your prompt" phrasing. It's wired into
`AIMentor.provide_hint`, since `/hint` is the one endpoint that forwards free-text
user input to an LLM. This is defense-in-depth on top of the system prompt's own
constraints, not a full jailbreak defense.

## Performance

Measured latency (gpt-4o, single call, local network) — Commander ~2.2s, Mentor
~2.2s, Evaluator ~2.9s. This meets the <3s target in the Technical Spec for
Commander/Mentor, though it's close enough to the limit that it's worth watching
under real network conditions.

`OpenAIClient.call()` has two safety nets, per the "AI Latency Too High" risk
mitigation in `IRIS_Team_Workflow.md`:
- A request timeout (`OPENAI_TIMEOUT_SECONDS`, default 8s) so a hung call can't
  block a request (or the incident WebSocket loop) indefinitely.
- A fallback model (`OPENAI_FALLBACK_MODEL`, default `gpt-4o-mini`) that's used
  automatically if the primary model call times out or errors.

## Testing

- `python tests/test_commander.py` / `test_mentor.py` / `test_evaluator.py` /
  `test_full_flow.py` — standalone scripts, call the real OpenAI API directly.
- From `backend/`: `pytest` runs the full API test suite with the AI agents
  **mocked** (fast, deterministic, no API key needed) — see
  `backend/tests/conftest.py::mock_ai_bridge`.
- From `backend/`: `pytest -m live` runs `test_live_e2e.py`, which exercises the
  entire Silent Login flow through the real HTTP API against the real OpenAI API
  (needs `OPENAI_API_KEY` in `.env`). Not run by default (costs money/time).

## Known follow-ups (not yet done)

- Each agent currently sends its full instructions to OpenAI twice (once
  unformatted as the system role via `get_system_prompt()`, once fully formatted
  as the user role). Works correctly, just wastes tokens — worth tightening by
  separating fixed instructions (system role) from per-call context (user role).
- `POST /complete` doesn't write to the PostgreSQL `session_scores` table yet —
  needs a real Postgres `users` row to satisfy the foreign key, which is a
  Users/Auth concern outside AI integration scope.
