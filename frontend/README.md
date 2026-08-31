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
taken). `src/hooks/useSimulation.ts` calls the real backend REST API (login,
register, start/investigate/decide, ws-ticket) — the backend must be running
for the app to work.

## Environment variables

Copy `.env.example` to `.env` and adjust if the backend runs somewhere other than
`localhost:8000`:

- `VITE_API_BASE` — REST API base URL.
- `VITE_WS_BASE` — WebSocket base URL.

## Building for production

```bash
npm run build
```

Output goes to `dist/`. Preview the production build locally with:

```bash
npm run preview
```

## Testing

```bash
npm run test        # run once
npm run test:watch  # watch mode
```

Vitest + Testing Library + jsdom. `src/test/setup.ts` wires up `jest-dom`
matchers. `fetch` calls in tests are stubbed with `vi.stubGlobal` rather than
hitting a real backend — see `src/hooks/useSimulation.test.ts`.

## Project structure

- `src/components/` — reusable UI components (SOC theme atoms).
- `src/pages/` — route-level screens (Home, Simulation, Report, History).
- `src/hooks/` — `useSimulation` (Zustand store, wired to the real REST API)
  and `useWebSocket` (connects to the backend's live incident updates).
- `src/styles/` — Tailwind theme (`globals.css`) and custom keyframes
  (`animations.css`).
