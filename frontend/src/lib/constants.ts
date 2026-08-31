export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api'
export const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'ws://localhost:8000/ws'

// Mirrors backend/app/simulation/engine.py's MAX_HINTS_PER_INCIDENT -- used
// only to seed the displayed count before the first hint response comes
// back with the server's actual `hints_remaining`, which is always the
// source of truth after that.
export const MAX_HINTS_PER_INCIDENT = 3
