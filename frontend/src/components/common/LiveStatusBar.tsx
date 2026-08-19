// Inspired by https://escaperoom.autoright10.com/'s top ticker bar
// ("מבצע חירום" / "שידור חי" with pulsing live-broadcast dots). Global,
// rendered once above every page, to keep the "live incident" tension
// present even on non-simulation pages like Home/History.
function PulseDot({ colorClass }: { colorClass: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colorClass}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${colorClass}`} />
    </span>
  )
}

export default function LiveStatusBar() {
  return (
    <div className="flex w-full items-center justify-between border-b border-border-default bg-bg-secondary px-4 py-1.5 text-[11px] uppercase tracking-wider">
      <div className="flex items-center gap-2 text-accent-danger">
        <PulseDot colorClass="bg-accent-danger" />
        Live Simulation
      </div>
      <div className="hidden text-text-muted sm:block">▸ IRIS Cyber Defense Console</div>
      <div className="flex items-center gap-2 text-accent-primary">
        <PulseDot colorClass="bg-accent-primary" />
        System Online
      </div>
    </div>
  )
}
