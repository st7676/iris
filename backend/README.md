# Iris Backend

FastAPI backend for the Iris SOC incident-simulation platform. Owns the REST API, the
incident state machine, and WebSocket updates, backed by PostgreSQL (users, scores) and
MongoDB (scenarios, incidents, evidence). AI Commander/Mentor/Evaluator (`/hint`,
`/complete`, and the incident WebSocket) are real OpenAI-backed agents from the sibling
[`ai_services/`](../ai_services) project, bridged in via
[`app/core/ai_bridge.py`](app/core/ai_bridge.py) — not mock responses.

## Running locally

Copy `ai_services/.env.example` to `ai_services/.env` and set a real `OPENAI_API_KEY`
(needed for `/hint`, `/complete`, and WebSocket updates to call OpenAI instead of failing
with a 503):

```bash
cp ../ai_services/.env.example ../ai_services/.env
```

Then:

```bash
docker-compose up
```

This starts three services: `fastapi` (port `8000`), `db` (Postgres, port `5432`), and
`mongo` (MongoDB, port `27017`). On startup the API creates the Postgres tables, creates
MongoDB indexes, and seeds the `silent_login_v1` scenario into both stores.

- API root: http://localhost:8000/
- Interactive docs (Swagger UI): http://localhost:8000/docs
- OpenAPI schema: http://localhost:8000/openapi.json — import this directly into
  Postman/Insomnia rather than maintaining a separate collection file.

To run the API outside Docker, copy `.env.example` to `.env`, point `DATABASE_URL` /
`MONGODB_URL` at your own Postgres/Mongo instances, then:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Running tests

```bash
pip install -r requirements.txt
pytest tests/ -v
```

The test suite mocks MongoDB (`mongomock_motor`) and PostgreSQL (an in-memory SQLite
swap, see `tests/conftest.py::postgres_db`), and stubs the OpenAI-backed AI agents (see
`tests/conftest.py::mock_ai_bridge`), so it runs without Docker, a live database, or an
`OPENAI_API_KEY`. It covers scenario start, incident retrieval, investigate/decide
(including severity branching), hint/complete/report, the incidents WebSocket, a full
happy-path E2E flow (asserting both Mongo and Postgres state), edge cases (invalid
user_id, missing incident_id, concurrent requests), AI-call failure handling (503s
instead of crashes), and response-time sanity checks.

`tests/test_live_e2e.py` runs the same happy path against the *real* OpenAI API. It's
tagged `@pytest.mark.live` and excluded by default (see `pytest.ini`) since it costs
money and needs a real `OPENAI_API_KEY`; run it explicitly with `pytest -m live`.

## Performance & logging

On startup, `init_db()` creates unique indexes on `incidents.incident_id` and
`scenarios.scenario_id` (see [`app/db/init_db.py`](app/db/init_db.py)) — every lookup in
this API queries by one of those fields, so without them each request would be a full
collection scan. Each core endpoint (`start`, `investigate`, `decide`, `hint`,
`complete`) logs a structured `incident_id=... user_id=... action=...` line at INFO
level; see [`app/core/logging_config.py`](app/core/logging_config.py) for the log
format.

`tests/test_api.py::test_non_ai_endpoints_respond_quickly` asserts these endpoints
respond well under 500ms against the mocked MongoDB/SQLite used in tests. This was also
verified against the real Dockerized Postgres/MongoDB (`docker-compose up db mongo` +
`curl -w "%{time_total}\n"`): register/start/investigate/decide all landed in the
200-320ms range, well within budget. `/complete` (which calls the AI Evaluator) responds
in ~2.7s even when the OpenAI call fails outright, inside the <3s target from the
Technical Spec.

## API endpoints

### Users

| Method | Path | Description |
|---|---|---|
| POST | `/api/users/register` | Register a new user |
| POST | `/api/users/login` | Authenticate against an existing user |
| GET | `/api/users/{user_id}` | Get a user by id |
| GET | `/api/users/{user_id}/history` | Get a user's past session scores |

```bash
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username": "sara_soc", "email": "sara@example.com", "password": "StrongPassw0rd!"}'

curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username": "sara_soc", "password": "StrongPassw0rd!"}'
```

`login` returns `401` for both a wrong password and an unknown username (never `404`), so a
caller can't enumerate which usernames are registered. Both `register` and `login` are
rate-limited to 10 requests/minute per IP (see [`app/core/rate_limit.py`](app/core/rate_limit.py))
to blunt brute-force attempts; exceeding it returns `429`.

### Scenarios

| Method | Path | Description |
|---|---|---|
| POST | `/api/scenarios/{scenario_id}/start` | Start a new incident from a scenario |

Two scenarios are seeded on startup: `silent_login_v1` and `insider_threat_v1` (see
[`app/db/init_db.py`](app/db/init_db.py)) — the same engine and branching logic drive both,
proving the simulation isn't hardcoded to a single flow.

```bash
curl -X POST http://localhost:8000/api/scenarios/silent_login_v1/start \
  -H "Content-Type: application/json" \
  -d '{"scenario_id": "silent_login_v1", "user_id": "123e4567-e89b-12d3-a456-426614174000"}'
```

Response:

```json
{
  "incident_id": "SF-2026-0142",
  "scenario_id": "silent_login_v1",
  "status": "in_progress",
  "severity": "medium",
  "alert_message": "Unusual login activity detected.",
  "timestamp": "2026-01-15T10:30:00Z"
}
```

### Incidents

| Method | Path | Description |
|---|---|---|
| GET | `/api/incidents/{incident_id}` | Get the full incident (status, evidence, action log) |
| POST | `/api/incidents/{incident_id}/investigate` | Investigate a piece of evidence |
| POST | `/api/incidents/{incident_id}/decide` | Record a decision, updates incident state |
| POST | `/api/incidents/{incident_id}/hint` | Ask AI Mentor for a graduated hint (never the answer outright) |
| POST | `/api/incidents/{incident_id}/complete` | End the simulation; AI Evaluator scores it and records `session_scores` |
| GET | `/api/incidents/{incident_id}/report` | Re-fetch a completed incident's report (score, categories, ideal vs. actual chain, feedback) |
| WS | `/ws/incidents/{incident_id}` | Live event updates for the incident (AI Commander) |

```bash
curl -X POST http://localhost:8000/api/incidents/SF-2026-0142/investigate \
  -H "Content-Type: application/json" \
  -d '{"evidence_type": "auth_logs"}'

curl -X POST http://localhost:8000/api/incidents/SF-2026-0142/decide \
  -H "Content-Type: application/json" \
  -d '{"decision": "escalate_to_soc_lead", "notes": "Multiple failed logins from an unrecognized location."}'

curl -X POST http://localhost:8000/api/incidents/SF-2026-0142/hint \
  -H "Content-Type: application/json" \
  -d '{"user_question": "What should I check first?"}'

curl -X POST http://localhost:8000/api/incidents/SF-2026-0142/complete

curl http://localhost:8000/api/incidents/SF-2026-0142/report
```

Each scenario has one "fast path" evidence type (`auth_logs` for `silent_login_v1`,
`file_access_logs` for `insider_threat_v1`) — checking it within 60 seconds of the
incident starting lowers severity by one level; checking anything else, or checking it
too late, raises severity instead (bounded between `low` and `critical`). See
[`app/simulation/branching_logic.py`](app/simulation/branching_logic.py).

### Instructor

| Method | Path | Description |
|---|---|---|
| GET | `/api/instructor/dashboard` | Aggregate session_scores: overall + per-scenario totals and averages |

```bash
curl http://localhost:8000/api/instructor/dashboard
```

```json
{
  "total_sessions": 3,
  "average_score": 76.67,
  "by_scenario": {
    "silent_login_v1": {"sessions": 2, "average_score": 70.0},
    "insider_threat_v1": {"sessions": 1, "average_score": 90.0}
  }
}
```

`hint` and `complete` call the real AI Mentor/Evaluator (see `app/core/ai_bridge.py`); if
the OpenAI call fails outright (rate limit, timeout, missing/invalid key), the endpoint
returns `503` rather than crashing. `complete` compares the scenario's
`ideal_reasoning_chain` (seeded in MongoDB) against the incident's actual `action_log`
(normalized via `build_actual_chain` in
[`app/simulation/engine.py`](app/simulation/engine.py)) and feeds both to AI Evaluator;
the resulting score is also written to PostgreSQL's `session_scores`, so it shows up in
`/api/users/{user_id}/history`.

## Configuration

All configuration is environment-based via [`app/core/config.py`](app/core/config.py)
(`DATABASE_URL`, `MONGODB_URL`, `MONGODB_DB_NAME`) — see `.env.example` — plus
`ai_services/.env` for `OPENAI_API_KEY` and friends (see
[`ai_services/.env.example`](../ai_services/.env.example)). There are no hardcoded
credentials in application code; the `secret` Postgres password in `docker-compose.yml`
is a local-only default for the Dockerized dev database (user `postgres`, matching
Postgres's default when `POSTGRES_USER` isn't set), not a real credential.

If PostgreSQL is unreachable at startup or at request time, the API logs a warning and
keeps working for the core Mongo-backed simulation flow (start/investigate/decide/hint/
complete) — only `users`/`session_scores`-backed features (registration, history) are
affected. See `app/db/init_db.py` and the `try/except SQLAlchemyError` in
`app/api/routes/incidents.py` and `scenarios.py`.

## Verified via `docker-compose up`

The full stack (build + all three services) has been run and exercised end to end, not
just tested with mocks. Two bugs only showed up this way and are now fixed:

- `docker-compose.yml`'s `DATABASE_URL` used `user:pass`, but the `db` service's actual
  Postgres user is `postgres` (default, since `POSTGRES_USER` isn't set) — every real
  Docker run silently failed to connect to Postgres, masked by the "unreachable" fallback
  warning. Fixed to `postgres:secret`.
- `requirements.txt` listed bare `uvicorn`, which has no WebSocket implementation —
  `/ws/incidents/{incident_id}` returned a 404 in the real deployed container ("No
  supported WebSocket library detected"). This was invisible to `pytest` because
  `TestClient`'s `websocket_connect` uses Starlette's in-process test transport, which
  doesn't need one. Fixed by switching to `uvicorn[standard]`.

With those fixed, a full register → start → investigate → decide → complete → history
flow, the WebSocket, structured logs, MongoDB indexes, and Postgres tables were all
confirmed working against the real Dockerized stack.

### Day 21 rehearsal (both scenarios, real Docker)

Re-ran the full path end to end against a clean `docker-compose down && up --build` for
both scenarios: register → login → start → investigate (x1 for Silent Login, x3 for
Insider Threat) → decide → complete → report → history → instructor dashboard.
Register/login/start/investigate/decide all worked correctly on both scenarios,
including the per-scenario severity branching (`auth_logs` vs. `file_access_logs` as the
fast path) and rate limiting.

**`complete` still 503s** — Docker Desktop's proxy (`docker info` shows
`http.docker.internal:3128` still configured) blocks the container's outbound HTTPS to
OpenAI with `openai.APIConnectionError: Connection error.`, exactly the failure Day 15
was scoped to fix. Day 15 was deprioritized this sprint in favor of Login (Day 16),
Insider Threat (Day 17-18), Instructor Dashboard (Day 19), and rate
limiting/dependency audit (Day 20) — it remains the one open item before a live demo can
show a real AI-scored `complete`/`report`. Everything downstream of it degrades exactly
as designed: `complete` returns `503` instead of crashing, the incident stays
`in_progress` rather than silently completing with no score, and `/report`,
`/users/{id}/history`, and `/instructor/dashboard` all correctly show nothing recorded
for that incident. `pytest tests/ -v` (34 tests, mocked AI) passes in full regardless,
since it doesn't depend on the container's network path to OpenAI.

### Day 15, resolved: `CERTIFICATE_VERIFY_FAILED` inside Docker, but not on host

Root cause: a local TLS-intercepting tool on the host machine (a corporate proxy,
antivirus HTTPS scanning, a content filter, a VPN client, etc.) was re-signing outbound
HTTPS with its own locally-trusted root CA. Windows trusts that root (so the host
worked); the Linux container's separate CA store didn't (so it failed). Diagnose with:

```bash
docker run --rm alpine sh -c "apk add --no-cache openssl >/dev/null; \
  openssl s_client -connect api.openai.com:443 -servername api.openai.com -showcerts 2>/dev/null | \
  openssl x509 -noout -issuer"
```

If the issuer isn't a recognizable public CA (Let's Encrypt, DigiCert, etc.), that's a
local interceptor. **This is fixed per machine, not in this repo** -- the intercepting
CA is unique to each developer's own setup and wouldn't help (or would even be
misleading) on anyone else's:

1. Export the interceptor's root CA as PEM into `backend/.local/` (gitignored).
2. Add a `backend/docker-compose.override.yml` (also gitignored -- `docker-compose`
   loads it automatically alongside `docker-compose.yml`) that mounts the cert into
   `/usr/local/share/ca-certificates/`, runs `update-ca-certificates`, and sets
   `SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt` (httpx -- and therefore the OpenAI
   SDK -- honors that env var ahead of its bundled `certifi` CA list).

Teammates without that local override file are completely unaffected; `docker-compose
up` behaves exactly as before for them.

With this in place, `/complete` now reaches OpenAI successfully end to end (confirmed:
`openai.RateLimitError: insufficient_quota` came back from a real API response, not a
connection error -- a separate, unrelated billing matter, not a code or infra issue).
