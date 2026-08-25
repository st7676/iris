# IRIS Design Spec v2 — "Tech Noir"

Built together with the user, confirmed via visual examples (not text guesses).
Supersedes the earlier hacker-terminal and case-file/detective-board attempts.

## Palette

| Token | Value | Use |
|---|---|---|
| Background primary | `#0d1117` | Page background |
| Background panel | `#161b22` | Cards/panels |
| Border | `#30363d` | Panel borders |
| Text primary | `#ffffff` | Headings |
| Text secondary | `#c9d1d9` | Body text |
| Accent | `#2dd4bf` (electric teal) | Buttons, links, active states |
| Danger | keep existing red for severity/alerts (not yet chosen — reuse current) |

## Typography

- **Headlines / display text**: Orbitron (700-800 weight), sci-fi/technical feel
- **Body / UI text**: Inter (400-700 weight), clean and readable
- No more monospace-everywhere; monospace reserved only for genuine data (log tables, IDs)

## Components

- **Style**: combination of Flat/Minimal + Card-Elevated — rounded corners (8-14px),
  soft drop shadow for depth, clean 1px borders
- **Explicitly NOT wanted**: neon glow / box-shadow bloom effects on borders or buttons
- Buttons: solid teal fill for primary actions, subtle bordered/transparent for secondary

## Severity / Semantic Colors (Option 2 — Bright/Saturated, confirmed)

| Token | Value | Use |
|---|---|---|
| Danger / Critical | `#ff2d55` | Critical severity, errors |
| Warning / Medium | `#ff9500` | Medium severity |
| Info | `#0ea5ff` | Informational badges |

## Background

Flat, no texture — consistent with the clean/minimal direction chosen for
components (no glow, simple borders). `#0d1117` solid.

## Interaction Model — CONFIRMED (supersedes a dashboard-with-panels layout)

SimulationPage is not a panel/button dashboard. It's a **scene-based investigation**:

- A real (moody, dim, atmospheric) photo of an office/desk scene is the background.
- Interactive objects are marked with **subtle circular hotspots** — a thin outline
  only, no default glow/pulse. They only highlight (teal glow) on hover, so the
  player has to explore the scene rather than be told where to click. This was a
  hard requirement after two earlier attempts with obvious pulsing/glowing hotspots
  were explicitly rejected ("user should think for themselves what to click").
- Clicking certain objects (e.g., the monitor) opens a **nested view** — e.g., a
  "desktop" screen with folder/app icons. Some icons are real (Mail, Auth Logs)
  and some are decoys (Music, Vacation Photos) the player must tell apart.
  This nested-exploration structure applies to **both evidence gathering and
  response actions** — everything becomes a discoverable object/click, not a
  labeled button list.
- Confirmed reference points: real escape-room mobile games (e.g., "Escape Room:
  50 Rooms") and https://escaperoom.autoright10.com/ (the original inspiration
  from the very first request) — point-and-click discovery, not a SOC dashboard.

### Implementation approach (data layer unchanged)

The existing backend contract doesn't change — `investigateEvidence(label)` and
`decide(label)` still call the same `/investigate` and `/decide` endpoints. Only the
*trigger* changes: instead of a button with a label, a hotspot click (possibly
after opening a nested "desktop"/drawer view) calls the same store actions.
Scenario config (`lib/scenarios.ts`) needs hotspot coordinates + real/decoy icon
sets added per scenario, alongside the existing action lists.

## Background photo

Needs a specific, on-theme, logo-free image (dim/moody office desk, night,
SOC-analyst-alone feel) — the mockup used a placeholder Unsplash photo with a
visible Apple logo, explicitly NOT final. Source a proper one before/during
implementation.

## Process note

**Standing rule**: all future design decisions go through a visual example first
(mini HTML mockup + screenshot), never a text-only description to choose from.
