// The analyst's desk, rendered as one photoreal background image with a
// handful of clickable "hotspots" positioned over the physical objects in
// the photo (monitors, phone, folder stack) instead of a generic button
// grid. Each hotspot lights its object from the middle outward and fades
// to nothing before its own edge: dim and slowly breathing while
// unrevealed, steady and brighter once checked, so the desk visibly
// "remembers" what's been looked at without ever drawing a box.
export type HotspotSlot = 'monitor-left' | 'monitor-center' | 'monitor-right' | 'phone' | 'folder'

export interface HotspotAction {
  slot: HotspotSlot
  label: string
  kind: 'investigate' | 'decide'
  revealed: boolean
}

// Percentages against the image's own 1535x1024 frame, not the rendered
// container size -- the wrapper below locks that aspect ratio so these
// stay aligned with the photo at any width. Measured from the actual
// pixels (a column-scan for the monitors' teal glow, cropped-region checks
// for phone/folder), not eyeballed -- these should track the real object
// bounds tightly rather than a generic rectangle roughly over it.
const HOTSPOT_POSITION: Record<HotspotSlot, { left: string; top: string; width: string; height: string }> = {
  'monitor-left': { left: '11.9%', top: '22.2%', width: '25.7%', height: '24%' },
  'monitor-center': { left: '39.5%', top: '14.4%', width: '27.1%', height: '29.9%' },
  'monitor-right': { left: '68.4%', top: '22.8%', width: '28%', height: '24.8%' },
  phone: { left: '80%', top: '49.5%', width: '15.5%', height: '23.5%' },
  folder: { left: '85.1%', top: '70.3%', width: '14.5%', height: '19%' },
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
  return (
    <div className={className ?? 'relative h-full w-full overflow-hidden'}>
      <img
        src="/scenes/desk_base_v1.png"
        alt="Your desk"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {actions.map((action) => {
        const pos = HOTSPOT_POSITION[action.slot]
        if (!pos) return null

        return (
          <button
            key={action.slot}
            type="button"
            onClick={() => onSelect(action)}
            disabled={disabled}
            title={action.label}
            style={pos}
            className="group absolute rounded-md bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent-info disabled:cursor-not-allowed"
          >
            {/*
              The light itself. Two things keep it from ever reading as a
              rectangle: the gradient reaches full transparency well inside
              the element's box (so its own edge is never drawn), and the
              blend mode only ever *adds* light -- a fully transparent
              pixel contributes nothing at all, whereas a painted overlay
              would still tint the desk behind it a flat grey. It's a lamp
              shining on the object, not a decal stuck over it.

              plus-lighter, not screen: measured against this photo's two
              extremes, screen shifts the bright manila folders by only ~16
              levels (invisible) while hitting the near-black phone for
              ~101 -- so the same glow that looked right on the phone
              simply never showed up on the paper. plus-lighter lands at
              ~41 and ~130, close enough that one setting reads on both.
            */}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 rounded-md [mix-blend-mode:plus-lighter] transition-opacity duration-500 ${
                action.revealed ? 'opacity-100' : 'glow-breathe group-hover:opacity-100'
              }`}
              style={{
                // Revealed reads as *cooler and settled* (blue-ish, steady),
                // unrevealed as *warm and live* (amber, breathing) -- a hue
                // difference survives on any backdrop, where a
                // brighter-vs-dimmer amber alone was nearly invisible on the
                // already-bright folders and already-dark phone.
                backgroundImage: action.revealed
                  ? 'radial-gradient(ellipse at center, rgb(var(--glow-info) / 0.5) 0%, rgb(var(--glow-info) / 0.2) 45%, transparent 74%)'
                  : 'radial-gradient(ellipse at center, rgb(var(--glow-success) / 0.62) 0%, rgb(var(--glow-success) / 0.26) 45%, transparent 74%)',
              }}
            />

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
