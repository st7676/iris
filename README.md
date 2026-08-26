# 🔍 IRIS — פלטפורמת סימולציית אירועי סייבר מונעת AI

**IRIS** היא פלטפורמת חינוך למוקדי SOC (Security Operations Center) המדמה אירועי סייבר בעלי אתגר, בחזרה תמידית מ-Commander/Mentor/Evaluator המונעים ב-OpenAI.

## 🎯 מה זה?

IRIS מאמנת אנליסטים של SOC על ידי:
1. **מצב ראשוני** — תרחיש בעל "חתימה סגורה" (נתונים ידועים יש 'חזרה' אידיאלית)
2. **חקירה** — הצגת ראיות שונות, אם לא בזמן → חומרה עולה
3. **החלטות** — בחירה בפעולה (escalate, dismiss, etc.) — AI Evaluator מדרג את הביצוע
4. **Mentor hints** — עזרה מדורגת מ-AI (לעולם לא התשובה כמו שלם)
5. **ניתוח תוצאות** — דוח עם ביקורת AI, אם הנעו בעוד רצף סיבה-and-effect נכון

## 🏗️ ארכיטקטורה

```
iris/
├── frontend/          React + TypeScript + Vite (SOC dashboard theme)
├── backend/           FastAPI + PostgreSQL + MongoDB
└── ai_services/       OpenAI-backed AI Mentor/Commander/Evaluator agents
```

- **Backend** (`backend/`): REST API, incident state machine, WebSocket updates
- **Frontend** (`frontend/`): Dark SOC theme, incident simulation UI
- **AI Services** (`ai_services/`): AI agents bridged into API via `app/core/ai_bridge.py`

## 🚀 התחלה מהירה

### דרישות
- Docker + Docker Compose
- Node.js ≥18 (frontend only)
- Python 3.9+ (backend only)

### רץ הכל יחד

```bash
docker-compose up
```

זה מתחיל:
- **FastAPI backend**: http://localhost:8000 (Swagger UI: `/docs`)
- **PostgreSQL**: `:5432`
- **MongoDB**: `:27017`

הממשק מעלה את הפרונטאנד בנפרד:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

היישום פועל ב-http://localhost:5173 (או היציאה החופשית הבאה).

## 📦 מבנה הפרויקט

### Backend (`backend/`)

REST API FastAPI עם:
- **Endpoints**:
  - `POST /api/users/register` — בטחון משתמש
  - `POST /api/scenarios/{scenario_id}/start` — התחל סימולציה
  - `POST /api/incidents/{incident_id}/investigate` — בדוק ראיה
  - `POST /api/incidents/{incident_id}/decide` — קבל החלטה
  - `POST /api/incidents/{incident_id}/hint` — בקש רמז מ-AI
  - `POST /api/incidents/{incident_id}/complete` — סיים, AI Evaluator דורג
  - `GET /api/incidents/{incident_id}/report` — ראה דוח ניתוח
  - `WS /ws/incidents/{incident_id}` — עדכונים חיים (AI Commander)

- **DB**: PostgreSQL (משתמשים, ניקוד) + MongoDB (תרחישים, אירועים, ראיות)
- **AI Bridge**: OpenAI API calls (מנטור, מחיל, מעריך)

ראה [`backend/README.md`](backend/README.md) לפרטים מלאים.

### Frontend (`frontend/`)

React + TypeScript + Vite עם:
- **Screens**: Home, Simulation, Report, History
- **Theme**: SOC dark dashboard (Tailwind CSS v4)
- **State**: Zustand (incident, user, simulation state)
- **Components**: Reusable SOC-themed atoms

ראה [`frontend/README.md`](frontend/README.md) לפרטים מלאים.

### AI Services (`ai_services/`)

OpenAI-backed agents:
- **Commander** — חזון בעיתי/Escalation בזמן אמת
- **Mentor** — רמזים מדורגים (לעולם לא תשובה כמו שלם)
- **Evaluator** — מדרג החלטות לעומת רצף הסיבה-effect האידיאלי

Bridged into backend via `app/core/ai_bridge.py`.

## 🧪 בדיקות

### Backend

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

מבדוקים:
- Mocked MongoDB (`mongomock_motor`)
- Mocked PostgreSQL (SQLite in-memory)
- Stubbed AI agents
- Happy-path E2E, edge cases, AI failures

Live tests against real OpenAI API:

```bash
pytest -m live
```

(Requires `OPENAI_API_KEY`; excluded by default כי דורש $)

### Frontend

```bash
cd frontend
npm run build   # Production build
npm run test    # Jest/Vitest suite (if configured)
```

## 📋 תצורה

### Backend

Copy `backend/.env.example` ל-`backend/.env`:

```env
DATABASE_URL=postgresql://postgres:secret@db:5432/iris
MONGODB_URL=mongodb://mongo:27017
MONGODB_DB_NAME=iris
```

(Docker Compose sets these automatically.)

### AI Services

Copy `ai_services/.env.example` ל-`ai_services/.env`:

```env
OPENAI_API_KEY=sk-...
```

(Needed for `/hint`, `/complete`, WebSocket updates.)

## 🔗 ממשקים ראשיים

| Component | Port | Link |
|---|---|---|
| Frontend | 5173 | http://localhost:5173 |
| FastAPI | 8000 | http://localhost:8000 |
| Swagger UI | 8000 | http://localhost:8000/docs |
| PostgreSQL | 5432 | `localhost:5432` |
| MongoDB | 27017 | `localhost:27017` |

## 📖 זרימה

```
1. משתמש נרשם        → POST /api/users/register
2. משתמש בוחר תרחיש  → POST /api/scenarios/{scenario_id}/start
3. משתמש חוקר ראיות → POST /api/incidents/{incident_id}/investigate
4. משתמש מחליט       → POST /api/incidents/{incident_id}/decide
5. משתמש שואל רמז    → POST /api/incidents/{incident_id}/hint (AI)
6. משתמש מסיים        → POST /api/incidents/{incident_id}/complete (AI Evaluator)
7. משתמש קורא דוח    → GET /api/incidents/{incident_id}/report
```

## ⚙️ פתרון בעיות

### PostgreSQL לא מתחבר?
הגב Backend logs: "Warning: PostgreSQL unreachable". המנוע עובד באופן מלא ללא PostgreSQL (רק לא רישום/היסטוריה).

### WebSocket לא עובד?
תבדוק `requirements.txt` עבור `uvicorn[standard]` (צריך WebSocket support).

### OpenAI API שגיאה?
`/hint` ו-`/complete` חוזרים `503` במקום להתרסק. בדוק `ai_services/.env` עבור `OPENAI_API_KEY` תקף.

## 📝 ספרות

- [`backend/README.md`](backend/README.md) — API endpoints, DBs, performance
- [`frontend/README.md`](frontend/README.md) — React structure, Tailwind theme
- [`ai_services/README.md`](ai_services/README.md) — AI agents, OpenAI setup
- `docker-compose.yml` — Service orchestration
- `backend/app/core/config.py` — Configuration
- `backend/app/simulation/branching_logic.py` — Incident severity branching
- `backend/app/core/ai_bridge.py` — AI agent bridging

## 📜 רישיון

IRIS is an educational platform for SOC training and incident simulation research.

## 🤝 תרומה

Main branch for development and contributions.

---

**מתחיל?** ראה [`backend/README.md`](backend/README.md) או [`frontend/README.md`](frontend/README.md).
