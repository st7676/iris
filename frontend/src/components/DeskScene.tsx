import { useState } from 'react'

// The analyst's desk, rendered as one hand-illustrated inline SVG -- a
// full room (CCTV wall, evidence corkboard, server rack, monitor cluster,
// desk clutter) instead of a photo, with a handful of clickable
// "hotspots" over the illustrated objects (the three monitors, the
// phone, the folder stack) instead of a generic button grid.
//
// The hover/click affordance is the reference room illustration's own
// mechanism, not a repainted one: hovering an object brightens *that
// object's actual silhouette* via an SVG `filter: drop-shadow(...)
// brightness(...)`, the same three color/blur values the reference used
// per object kind (info-cyan for the monitors, warm-amber for the phone,
// info-cyan for the folder), transitioning over the same 220ms. There is
// no idle "breathing" glow -- like the reference, the affordance is
// purely hover-driven. `revealed` state (evidence already found) gets its
// own steady, milder version of the same filter so the desk still shows
// what's been checked without needing to hover.
export type HotspotSlot = 'monitor-left' | 'monitor-center' | 'monitor-right' | 'phone' | 'folder'

export interface HotspotAction {
  slot: HotspotSlot
  label: string
  kind: 'investigate' | 'decide'
  revealed: boolean
}

// Percentages against the illustration's own 1535x1024 frame, not the
// rendered container size -- the wrapper below locks that aspect ratio so
// these stay aligned with the art at any width. These are the reference
// room illustration's own monitor-cluster/phone/documents coordinates,
// scaled by the same 0.959375 factor the whole scene is drawn at (see
// SCENE_SCALE in DeskSceneArt below), not eyeballed. The CCTV wall,
// corkboard and server rack are atmospheric set dressing only -- this
// component's hotspot slots don't cover them.
const HOTSPOT_POSITION: Record<HotspotSlot, { left: string; top: string; width: string; height: string }> = {
  'monitor-left': { left: '23.23%', top: '39.54%', width: '14.79%', height: '16.46%' },
  'monitor-center': { left: '36.25%', top: '32.79%', width: '21.25%', height: '21.55%' },
  'monitor-right': { left: '54.47%', top: '39.54%', width: '14.79%', height: '16.46%' },
  phone: { left: '8.75%', top: '59.02%', width: '5.62%', height: '9.37%' },
  folder: { left: '64.82%', top: '72.75%', width: '8.79%', height: '15.63%' },
}

// Reference values for the drop-shadow glow, one per object kind -- info
// (cyan) for the digital screens, warm (amber) for the phone. A milder,
// non-brightening version of each is used for the steady "revealed" state.
const HOVER_FILTER: Record<'info' | 'warm', string> = {
  info: 'drop-shadow(0 0 20px rgba(0,180,255,0.65)) brightness(1.12)',
  warm: 'drop-shadow(0 0 16px rgba(255,190,120,0.55)) brightness(1.12)',
}
const REVEALED_FILTER: Record<'info' | 'warm', string> = {
  info: 'drop-shadow(0 0 12px rgba(0,153,255,0.4))',
  warm: 'drop-shadow(0 0 12px rgba(255,190,120,0.4))',
}
const SLOT_KIND: Record<HotspotSlot, 'info' | 'warm'> = {
  'monitor-left': 'info',
  'monitor-center': 'info',
  'monitor-right': 'info',
  phone: 'warm',
  folder: 'info',
}

interface DeskSceneProps {
  actions: HotspotAction[]
  onSelect: (action: HotspotAction) => void
  disabled?: boolean
  // Sizing is the parent's call -- SimulationPage locks a 1535:1024 frame
  // to the viewport (full-bleed) so this same component and the same
  // hotspot percentages work whether it's filling the whole screen or
  // boxed inside a card. Defaults to filling whatever parent it's given.
  className?: string
}

export default function DeskScene({ actions, onSelect, disabled, className }: DeskSceneProps) {
  const [hovered, setHovered] = useState<HotspotSlot | null>(null)
  const revealed = new Set(actions.filter((a) => a.revealed).map((a) => a.slot))

  return (
    <div className={className ?? 'relative h-full w-full overflow-hidden'}>
      <DeskSceneArt hovered={hovered} revealed={revealed} />

      {actions.map((action) => {
        const pos = HOTSPOT_POSITION[action.slot]
        if (!pos) return null

        return (
          <button
            key={action.slot}
            type="button"
            onClick={() => onSelect(action)}
            onMouseEnter={() => setHovered(action.slot)}
            onMouseLeave={() => setHovered((s) => (s === action.slot ? null : s))}
            onFocus={() => setHovered(action.slot)}
            onBlur={() => setHovered((s) => (s === action.slot ? null : s))}
            disabled={disabled}
            title={action.label}
            style={pos}
            className="group absolute rounded-md bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent-info disabled:cursor-not-allowed"
          >
            <span
              className={`pointer-events-none absolute inset-x-0 -bottom-6 truncate px-1 text-center text-[10px] uppercase tracking-wide transition-opacity ${
                action.revealed
                  ? 'text-accent-info opacity-80'
                  : 'text-accent-success opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
              }`}
            >
              {action.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// The room's own native size is 1600x900; the desk-scene frame that
// SimulationPage locks the viewport to is 1535x1024. This is the single
// scale factor everything below is drawn at (matched to width) -- the
// extra height it leaves short is filled by extending the desk surface
// downward rather than distorting any object's proportions.
const SCENE_SCALE = 1535 / 1600

interface DeskSceneArtProps {
  hovered: HotspotSlot | null
  revealed: Set<HotspotSlot>
}

// Filter style for one interactive object: hover wins over revealed,
// revealed wins over the default (no filter) state, transitioning over
// the reference's own 220ms.
function slotStyle(slot: HotspotSlot, hovered: HotspotSlot | null, revealed: Set<HotspotSlot>): React.CSSProperties {
  const kind = SLOT_KIND[slot]
  const filter = hovered === slot ? HOVER_FILTER[kind] : revealed.has(slot) ? REVEALED_FILTER[kind] : 'none'
  return { filter, transition: 'filter 220ms ease' }
}

// The illustration itself, split out of DeskScene so the hotspot-overlay
// logic above (which is the part that actually varies per render) stays
// readable. A faithful port of the reference room illustration -- CCTV
// wall, evidence corkboard, server rack, monitor cluster and desk
// clutter -- at SCENE_SCALE, not a redrawn approximation.
function DeskSceneArt({ hovered, revealed }: DeskSceneArtProps) {
  return (
    <svg
      viewBox="0 0 1535 1024"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="wallGrad" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#141a3d" />
          <stop offset="60%" stopColor="#0c1030" />
          <stop offset="100%" stopColor="#070a1c" />
        </radialGradient>
        <linearGradient id="deskGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#241a12" />
          <stop offset="12%" stopColor="#1c140d" />
          <stop offset="100%" stopColor="#0c0906" />
        </linearGradient>
        <linearGradient id="screenGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a4d7a" />
          <stop offset="100%" stopColor="#08192e" />
        </linearGradient>
        <linearGradient id="screenLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d7dce6" />
          <stop offset="100%" stopColor="#aab2c4" />
        </linearGradient>
        <linearGradient id="screenCode" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e2417" />
          <stop offset="100%" stopColor="#061309" />
        </linearGradient>
        <linearGradient id="cctvScreenGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f2436" />
          <stop offset="100%" stopColor="#050c14" />
        </linearGradient>
        <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,190,120,0.35)" />
          <stop offset="100%" stopColor="rgba(255,190,120,0)" />
        </radialGradient>
        <radialGradient id="cyanBleed" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,153,255,0.28)" />
          <stop offset="100%" stopColor="rgba(0,153,255,0)" />
        </radialGradient>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.045 0" />
        </filter>
        <pattern id="corkTexture" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#5b4530" />
          <circle cx="3" cy="4" r="0.8" fill="#4a3826" />
          <circle cx="10" cy="9" r="0.7" fill="#6b5238" />
          <circle cx="7" cy="2" r="0.5" fill="#4a3826" />
        </pattern>
        <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
          <stop offset="55%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
        </radialGradient>
      </defs>

      <g transform={`scale(${SCENE_SCALE})`}>
        {/* back wall */}
        <rect x="0" y="0" width="1600" height="620" fill="url(#wallGrad)" />

        {/* ambient glow bleeds */}
        <ellipse cx="310" cy="230" rx="280" ry="180" fill="url(#cyanBleed)" filter="url(#softBlur)" />
        <ellipse cx="800" cy="470" rx="320" ry="140" fill="url(#cyanBleed)" filter="url(#softBlur)" opacity="0.9" />
        <ellipse cx="120" cy="700" rx="220" ry="140" fill="url(#lampGlow)" filter="url(#softBlur)" />

        {/* ===== CCTV WALL (left), decorative -- a 3x3 bank of camera
            feeds with one flagged anomaly, matching the reference room. */}
        <g>
          <rect x="50" y="55" width="540" height="350" rx="6" fill="#171c38" stroke="#232a4d" strokeWidth="3" />
          <rect x="66" y="66" width="90" height="24" rx="2" fill="#0a0c14" stroke="#1c2340" />
          <text x="76" y="83" fontSize="14" fill="#ff3860" fontFamily="var(--font-mono, monospace)" letterSpacing="1">
            23:42:07
          </text>
          {[0, 1, 2].map((col) =>
            [0, 1, 2].map((row) => {
              const x = 68 + col * 168
              const y = 100 + row * 100
              const isFlag = col === 1 && row === 2
              return (
                <g key={`${col}-${row}`}>
                  <rect
                    x={x}
                    y={y}
                    width="150"
                    height="86"
                    rx="3"
                    fill="url(#cctvScreenGrad)"
                    stroke={isFlag ? '#ff3860' : '#0a1420'}
                    strokeWidth={isFlag ? 2 : 1}
                  />
                  <rect x={x + 6} y={y + 6} width="138" height="74" fill="none" stroke="rgba(255,255,255,0.04)" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <line
                      key={i}
                      x1={x + 10}
                      y1={y + 12 + i * 17}
                      x2={x + 140}
                      y2={y + 12 + i * 17}
                      stroke="rgba(120,180,220,0.08)"
                      strokeWidth="1"
                    />
                  ))}
                  <circle cx={x + 14} cy={y + 12} r="2.6" fill={isFlag ? '#ff3860' : '#2fbf71'} />
                  {isFlag && (
                    <rect x={x + 4} y={y + 4} width="142" height="78" fill="none" stroke="#ff3860" strokeWidth="2" opacity="0.8" />
                  )}
                </g>
              )
            }),
          )}
        </g>

        {/* ===== CORKBOARD (center), decorative -- pinned incident sheet,
            evidence cards on red string, plus a network-diagram note and
            two sticky notes, matching the reference room. */}
        <g>
          <rect x="640" y="55" width="340" height="350" rx="4" fill="url(#corkTexture)" stroke="#3a2a18" strokeWidth="10" />
          <g transform="translate(656 68) rotate(-1)">
            <rect x="0" y="0" width="150" height="96" fill="#f4f0e4" stroke="#00000018" />
            <text x="8" y="16" fontSize="9" fill="#a33" fontFamily="var(--font-mono, monospace)" fontWeight="bold">
              INCIDENT #042
            </text>
            <text x="8" y="29" fontSize="8" fill="#333" fontFamily="var(--font-mono, monospace)">
              Possible Phishing Attack
            </text>
            {['1. Identify access', '2. Check systems', '3. Collect evidence', '4. Contain', '5. Eradicate', '6. Recover'].map(
              (t, i) => (
                <text key={t} x="8" y={44 + i * 9} fontSize="6.5" fill="#555" fontFamily="var(--font-mono, monospace)">
                  {t}
                </text>
              ),
            )}
          </g>
          {[
            { x: 670, y: 180, r: -6 },
            { x: 780, y: 170, r: 4 },
            { x: 860, y: 205, r: -3 },
            { x: 700, y: 270, r: 5 },
            { x: 820, y: 310, r: -5 },
          ].map((c, i) => (
            <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.r})`}>
              <rect x="0" y="0" width="64" height="46" fill="#e8e2d0" stroke="#00000022" />
              <line x1="8" y1="14" x2="56" y2="14" stroke="#999" strokeWidth="1.5" />
              <line x1="8" y1="22" x2="48" y2="22" stroke="#999" strokeWidth="1.5" />
              <line x1="8" y1="30" x2="52" y2="30" stroke="#999" strokeWidth="1.5" />
              <circle cx="32" cy="-2" r="3" fill="#c0392b" />
            </g>
          ))}
          <path
            d="M702 203 Q745 235 812 193 Q845 225 892 233 Q820 265 732 293 Q790 310 852 323"
            fill="none"
            stroke="#c0392b"
            strokeWidth="1.5"
            opacity="0.75"
          />
        </g>
        <g transform="translate(995 130) rotate(-4)">
          <rect x="0" y="0" width="140" height="170" fill="#f2ede0" stroke="#00000022" />
          <circle cx="70" cy="40" r="8" fill="none" stroke="#345" strokeWidth="1.5" />
          <circle cx="30" cy="90" r="8" fill="none" stroke="#345" strokeWidth="1.5" />
          <circle cx="110" cy="90" r="8" fill="none" stroke="#345" strokeWidth="1.5" />
          <circle cx="70" cy="140" r="8" fill="#ff3860" opacity="0.8" />
          <line x1="70" y1="48" x2="35" y2="84" stroke="#345" strokeWidth="1" />
          <line x1="70" y1="48" x2="105" y2="84" stroke="#345" strokeWidth="1" />
          <line x1="70" y1="98" x2="70" y2="132" stroke="#ff3860" strokeWidth="1" strokeDasharray="3 2" />
        </g>
        <g transform="translate(1002 108) rotate(6)">
          <rect x="0" y="0" width="46" height="46" fill="#e8c93a" opacity="0.9" />
        </g>
        <g transform="translate(1130 312) rotate(-8)">
          <rect x="0" y="0" width="42" height="42" fill="#f2d24a" opacity="0.9" />
          <line x1="6" y1="14" x2="34" y2="14" stroke="#8a7418" strokeWidth="1" opacity="0.5" />
          <line x1="6" y1="22" x2="30" y2="22" stroke="#8a7418" strokeWidth="1" opacity="0.5" />
        </g>

        {/* ===== SERVER RACK (right), decorative -- LED bank + cables,
            matching the reference room. */}
        <g>
          <rect x="1330" y="60" width="220" height="480" rx="4" fill="#12162c" stroke="#232a4d" strokeWidth="3" />
          {Array.from({ length: 9 }).map((_, i) => {
            const colors = ['#ff3860', '#ffb300', '#2fbf71', '#2fbf71', '#0099ff', '#a06bff']
            return (
              <g key={i}>
                <rect x="1348" y={82 + i * 50} width="184" height="38" fill="#191f3d" stroke="#0a0d1e" />
                <circle cx="1518" cy={101 + i * 50} r="3" fill={colors[i % colors.length]} />
                <circle cx="1506" cy={101 + i * 50} r="2" fill={colors[(i + 2) % colors.length]} opacity="0.8" />
                <rect x="1358" y={95 + i * 50} width={40 + ((i * 13) % 90)} height="4" fill="rgba(120,180,220,0.18)" />
              </g>
            )
          })}
          <path d="M1348 540 C1330 560 1360 600 1335 640" fill="none" stroke="#333" strokeWidth="5" />
          <path d="M1400 540 C1420 570 1385 610 1410 650" fill="none" stroke="#2a2a2a" strokeWidth="5" />
        </g>

        {/* ===== DESK ===== */}
        <path d="M-60 900 L-60 640 L1660 640 L1660 900 Z" fill="url(#deskGrad)" />
        <path d="M-60 645 L1660 645 L1660 660 L-60 660 Z" fill="rgba(120,170,220,0.06)" />

        {/* desk lamps flanking the monitors, decorative only */}
        <g transform="translate(40 560)">
          <rect x="-6" y="60" width="12" height="90" fill="#1a1a1a" />
          <path d="M0 60 L-40 10" stroke="#1a1a1a" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="-46" cy="4" rx="30" ry="12" fill="#2a2a2a" />
        </g>
        <g transform="translate(1560 560) scale(-1 1)">
          <rect x="-6" y="60" width="12" height="90" fill="#1a1a1a" />
          <path d="M0 60 L-40 10" stroke="#1a1a1a" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="-46" cy="4" rx="30" ry="12" fill="#2a2a2a" />
        </g>
        <ellipse cx="1490" cy="700" rx="220" ry="140" fill="url(#lampGlow)" filter="url(#softBlur)" />

        {/* SOC console laptop (right side), decorative */}
        <g transform="translate(1180 640)">
          <path d="M-10 130 L250 130 L246 136 L-28 136 Z" fill="#15161c" />
          <rect x="0" y="0" width="230" height="132" rx="4" fill="#0c0d12" />
          <rect x="10" y="10" width="210" height="112" fill="#04160c" />
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x="18" y={20 + i * 16} width={60 + ((i * 37) % 120)} height="6" fill="rgba(47,191,113,0.35)" />
          ))}
        </g>

        {/* main monitor cluster -- the three clickable screens. Each gets
            its own filter (see slotStyle) applied directly to its <g>, so
            hovering brightens the monitor's actual silhouette rather than
            a box drawn over it. */}
        <g transform="translate(430 380)">
          {/* left monitor -- light file-browser tone */}
          <g transform="rotate(-7 60 130)" style={slotStyle('monitor-left', hovered, revealed)}>
            <rect x="-40" y="10" width="220" height="150" rx="6" fill="#0d0f1a" stroke="#242a4d" strokeWidth="3" />
            <rect x="-28" y="22" width="196" height="126" fill="url(#screenLight)" />
            <rect x="-28" y="22" width="56" height="126" fill="rgba(0,0,0,0.06)" />
            <rect x="30" y="160" width="60" height="16" fill="#0d0f1a" />
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={i} x="-20" y={30 + i * 18} width="50" height="5" fill="rgba(0,0,0,0.15)" />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <rect key={i} x="36" y={34 + i * 22} width={70 + ((i * 31) % 80)} height="6" fill="rgba(20,30,50,0.18)" />
            ))}
          </g>

          {/* center monitor -- primary, dark code/terminal tone */}
          <g style={slotStyle('monitor-center', hovered, revealed)}>
            <rect x="150" y="-30" width="340" height="230" rx="6" fill="#0d0f1a" stroke="#2a3050" strokeWidth="3" />
            <rect x="168" y="-14" width="304" height="198" fill="url(#screenCode)" />
            <rect x="290" y="200" width="80" height="22" fill="#0d0f1a" />
            <rect x="250" y="222" width="160" height="10" fill="#0a0c16" />
            {Array.from({ length: 8 }).map((_, i) => (
              <rect
                key={i}
                x="184"
                y={2 + i * 22}
                width={40 + ((i * 41) % 190)}
                height="6"
                fill={i % 3 === 0 ? 'rgba(47,191,113,0.22)' : 'rgba(150,200,255,0.12)'}
              />
            ))}
          </g>

          {/* right monitor -- security alert. Pulses only while
              unread; once monitor-right is revealed it settles into the
              same calm scan-circle readout the reference room shows for
              a monitor with nothing currently wrong, matching its own
              alertUnread toggle instead of pulsing forever regardless of
              whether the analyst already investigated it. */}
          <g transform="rotate(7 560 130)" style={slotStyle('monitor-right', hovered, revealed)}>
            <rect x="530" y="10" width="220" height="150" rx="6" fill="#0d0f1a" stroke="#242a4d" strokeWidth="3" />
            <rect x="542" y="22" width="196" height="126" fill="url(#screenGlow)" />
            <rect x="600" y="160" width="60" height="16" fill="#0d0f1a" />
            {revealed.has('monitor-right') ? (
              <>
                <circle cx="590" cy="50" r="4" fill="none" stroke="rgba(47,191,113,0.35)" strokeWidth="1.5" />
                <circle cx="640" cy="90" r="4" fill="none" stroke="rgba(47,191,113,0.35)" strokeWidth="1.5" />
                <circle cx="690" cy="60" r="4" fill="#ff3860" opacity="0.7" />
                <line x1="590" y1="50" x2="640" y2="90" stroke="rgba(47,191,113,0.2)" strokeWidth="1" />
                <line x1="640" y1="90" x2="690" y2="60" stroke="rgba(255,56,96,0.3)" strokeWidth="1" strokeDasharray="2 2" />
              </>
            ) : (
              <g transform="translate(548 26)">
                <rect x="0" y="0" width="184" height="112" fill="rgba(255,56,96,0.12)" stroke="#ff3860" strokeWidth="1.5">
                  <animate attributeName="opacity" values="1;0.6;1" dur="1.3s" repeatCount="indefinite" />
                </rect>
                <text x="8" y="16" fontSize="10" fill="#ff6b85" fontFamily="var(--font-mono, monospace)" fontWeight="bold" letterSpacing="0.5">
                  SECURITY ALERT
                </text>
                <text x="8" y="32" fontSize="6.5" fill="#ffb3bd" fontFamily="var(--font-mono, monospace)">
                  Unauthorized login attempt
                </text>
                <text x="8" y="44" fontSize="6.5" fill="#ffb3bd" fontFamily="var(--font-mono, monospace)">
                  Source IP: 185.220.101.47
                </text>
                <text x="8" y="56" fontSize="6.5" fill="#ffb3bd" fontFamily="var(--font-mono, monospace)">
                  Severity: High
                </text>
                <text x="8" y="86" fontSize="7" fill="#ff6b85" fontFamily="var(--font-mono, monospace)" fontWeight="bold">
                  ▸ CLICK TO INVESTIGATE
                </text>
              </g>
            )}
          </g>
        </g>

        {/* keyboard + mouse */}
        <g transform="translate(560 660)">
          <rect x="0" y="0" width="300" height="90" rx="6" fill="#15161c" stroke="#000" strokeWidth="1" />
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 11 }).map((_, c) => (
              <rect key={`${r}-${c}`} x={8 + c * 26} y={8 + r * 15} width="20" height="11" rx="1.5" fill="#1f2028" />
            )),
          )}
          <ellipse cx="360" cy="50" rx="22" ry="34" fill="#15161c" />
        </g>

        {/* notepad, decorative */}
        <g transform="translate(430 680) rotate(-4)">
          <rect x="0" y="0" width="90" height="70" fill="#eef0e2" />
          <line x1="10" y1="16" x2="76" y2="16" stroke="#333" strokeWidth="1.2" />
          <line x1="10" y1="28" x2="70" y2="28" stroke="#888" strokeWidth="1" />
          <line x1="10" y1="38" x2="60" y2="38" stroke="#888" strokeWidth="1" />
          <line x1="10" y1="48" x2="72" y2="48" stroke="#888" strokeWidth="1" />
        </g>

        {/* ID badge, decorative */}
        <g transform="translate(360 700) rotate(8)">
          <rect x="0" y="0" width="54" height="74" rx="4" fill="#f4f6fa" stroke="#c9ccd6" />
          <rect x="8" y="8" width="38" height="26" fill="#8fa6c9" />
          <rect x="8" y="40" width="38" height="4" fill="#345" />
          <rect x="8" y="48" width="26" height="3" fill="#889" />
        </g>

        {/* small external drive, decorative */}
        <g transform="translate(900 715) rotate(-10)">
          <rect x="0" y="0" width="46" height="20" rx="3" fill="#20222c" stroke="#000" strokeWidth="0.5" />
          <rect x="4" y="4" width="38" height="4" fill="#31344a" />
          <circle cx="40" cy="15" r="1.6" fill="#2fbf71" />
          <rect x="-6" y="7" width="8" height="5" fill="#8890a0" />
        </g>

        {/* documents stack -- clickable "folder" */}
        <g transform="translate(1050 760)" style={slotStyle('folder', hovered, revealed)}>
          <g transform="rotate(-6)">
            <rect x="0" y="0" width="110" height="140" fill="#e9e6da" stroke="#00000018" />
          </g>
          <g transform="rotate(3)">
            <rect x="6" y="-4" width="110" height="140" fill="#f2f0e6" stroke="#00000018" />
            <line x1="18" y1="20" x2="96" y2="20" stroke="#999" strokeWidth="1.5" />
            <line x1="18" y1="32" x2="90" y2="32" stroke="#bbb" strokeWidth="1.5" />
            <line x1="18" y1="44" x2="94" y2="44" stroke="#bbb" strokeWidth="1.5" />
          </g>
        </g>

        {/* coffee mug, decorative */}
        <g transform="translate(240 750)">
          <path d="M0 10 Q-6 -6 34 -6 Q40 10 34 26 L0 26 Z" fill="#1f2937" />
          <path d="M34 4 Q52 4 52 16 Q52 26 34 24" fill="none" stroke="#1f2937" strokeWidth="5" />
        </g>

        {/* phone -- clickable */}
        <g transform="translate(140 640)" style={slotStyle('phone', hovered, revealed)}>
          <rect x="0" y="30" width="90" height="60" rx="4" fill="#111318" />
          <rect x="8" y="38" width="74" height="8" fill="#0a0a0e" />
          <path d="M10 20 Q45 -10 80 20 L70 34 Q45 14 20 34 Z" fill="#1a1c22" />
          <circle cx="80" cy="34" r="4" fill="#2fbf71" />
        </g>

        {/* subtle floor shadow line for grounding */}
        <rect x="0" y="878" width="1600" height="22" fill="rgba(0,0,0,0.35)" />
      </g>

      {/* the scaled room above ends at y=900*SCENE_SCALE=863.4 -- extend the
          desk surface the rest of the way down so the frame's extra height
          (1024 vs the room's native 900) still reads as more of the same
          desk, not an empty band. */}
      <rect x="0" y="863" width="1535" height="161" fill="url(#deskGrad)" />

      {/* vignette + film grain, tying the whole illustration together */}
      <rect x="0" y="0" width="1535" height="1024" fill="url(#vignette)" pointerEvents="none" />
      <rect x="0" y="0" width="1535" height="1024" filter="url(#grain)" opacity="0.5" pointerEvents="none" />
    </svg>
  )
}
