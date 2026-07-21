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
