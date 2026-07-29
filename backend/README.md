# Iris Backend

FastAPI backend for the Iris SOC incident-simulation platform. Owns the REST API, the
incident state machine, and WebSocket updates, backed by PostgreSQL (users, scores) and
MongoDB (scenarios, incidents, evidence).

## Running locally

```bash
docker-compose up
```

This starts three services: `fastapi` (port `8000`), `db` (Postgres, port `5432`), and
`mongo` (MongoDB, port `27017`). On startup the API creates the Postgres tables and seeds
the `silent_login_v1` scenario into both stores.

- API root: http://localhost:8000/
- Interactive docs (Swagger UI): http://localhost:8000/docs
- OpenAPI schema: http://localhost:8000/openapi.json

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

The test suite mocks MongoDB (`mongomock_motor`), so it runs without Docker or a live
database. It covers scenario start, incident retrieval, investigate/decide (including
severity branching), and the incidents WebSocket.

## API endpoints

### Users

| Method | Path | Description |
|---|---|---|
| POST | `/api/users/register` | Register a new user |
| GET | `/api/users/{user_id}` | Get a user by id |
| GET | `/api/users/{user_id}/history` | Get a user's past session scores |

```bash
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username": "sara_soc", "email": "sara@example.com", "password": "StrongPassw0rd!"}'
```

### Scenarios

| Method | Path | Description |
|---|---|---|
| POST | `/api/scenarios/{scenario_id}/start` | Start a new incident from a scenario |

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
| POST | `/api/incidents/{incident_id}/investigate` | Investigate a piece of evidence (mock data) |
| POST | `/api/incidents/{incident_id}/decide` | Record a decision, updates incident state |
| POST | `/api/incidents/{incident_id}/hint` | Get a hint for a question (mock data, pending AI Mentor integration) |
| POST | `/api/incidents/{incident_id}/complete` | End the simulation and get a score (mock data, pending AI Evaluator integration) |
| WS | `/ws/incidents/{incident_id}` | Live event updates for the incident |

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
```

Checking `auth_logs` within 60 seconds of the incident starting lowers severity by one
level; checking anything else, or checking `auth_logs` too late, raises it (bounded
between `low` and `critical`). See [`app/simulation/branching_logic.py`](app/simulation/branching_logic.py).

## Configuration

All configuration is environment-based via [`app/core/config.py`](app/core/config.py)
(`DATABASE_URL`, `MONGODB_URL`, `MONGODB_DB_NAME`) — see `.env.example`. There are no
hardcoded credentials in application code; the `secret` Postgres password in
`docker-compose.yml` is a local-only default for the Dockerized dev database, not a real
credential.
