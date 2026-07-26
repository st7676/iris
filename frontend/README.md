# IRIS Frontend

React + TypeScript + Vite frontend for IRIS, an AI-powered cybersecurity incident
simulation platform. Dark "SOC dashboard" theme built with Tailwind CSS v4 and
Zustand for state management.

## Running locally

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at `http://localhost:5173` (Vite picks the next free port if it's
taken). All simulation data is currently mocked in `src/hooks/useSimulation.ts` —
no backend connection is required to run the app.

## Environment variables

Copy `.env.example` to `.env` and adjust if the backend runs somewhere other than
`localhost:8000`:

- `VITE_API_BASE` — REST API base URL (not yet wired up).
- `VITE_WS_BASE` — WebSocket base URL (not yet wired up).

## Building for production

```bash
npm run build
```

Output goes to `dist/`. Preview the production build locally with:

```bash
npm run preview
```

## Project structure

- `src/components/` — reusable UI components (SOC theme atoms).
- `src/pages/` — route-level screens (Home, Simulation, Report, History).
- `src/hooks/` — `useSimulation` (Zustand store), `useAPI` / `useWebSocket`
  (scaffolded, not yet connected to a real backend).
- `src/styles/` — Tailwind theme (`globals.css`) and custom keyframes
  (`animations.css`).
