import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { playTick, playBootComplete } from '../../lib/sound'

const SESSION_KEY = 'iris-boot-shown'

const STATUS_LINE_KEYS = ['boot.lines.core', 'boot.lines.uplink', 'boot.lines.threatFeed', 'boot.lines.sensorArray'] as const

const TOTAL_DURATION_MS = 1500

interface BootSequenceProps {
  onDone: () => void
}

// A short, skippable HUD-style boot animation shown once per browser tab
// session before the app mounts. Earlier version typed every line out
// character-by-character, which read as slow and sparse; this one leans
// on the glowing IRIS wordmark + corner HUD brackets (reused from
// DeskScene/ScreenBezel's visual language) for immediate visual weight,
// and animates a fill bar + status checklist instead of typewriter text
// so the whole thing resolves in ~1.5s. Click/tap or any key skips
// straight to the app.
export default function BootSequence({ onDone }: BootSequenceProps) {
  const { t } = useTranslation()
  const STATUS_LINES = STATUS_LINE_KEYS.map((key) => t(key))
  const [visibleLines, setVisibleLines] = useState(0)
  const [granted, setGranted] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const doneRef = useRef(false)

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  function finish() {
    if (doneRef.current) return
    doneRef.current = true
    window.sessionStorage.setItem(SESSION_KEY, 'true')
    onDone()
  }

  useEffect(() => {
    if (prefersReducedMotion) {
      finish()
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []
    const perLine = TOTAL_DURATION_MS / (STATUS_LINES.length + 1)

    STATUS_LINES.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          playTick()
          setVisibleLines(i + 1)
        }, perLine * (i + 1))
      )
    })

    timers.push(
      setTimeout(() => {
        playBootComplete()
        setGranted(true)
      }, TOTAL_DURATION_MS)
    )
    timers.push(setTimeout(() => setFadingOut(true), TOTAL_DURATION_MS + 500))
    timers.push(setTimeout(finish, TOTAL_DURATION_MS + 950))

    const skip = () => finish()
    window.addEventListener('keydown', skip)
    window.addEventListener('click', skip)

    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('click', skip)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fillPct = granted ? 100 : (visibleLines / STATUS_LINES.length) * 100

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-bg-primary font-mono transition-opacity duration-500 cursor-pointer ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* HUD corner brackets -- same idea as a camera viewfinder / targeting
          reticle, reinforcing the "console" framing without extra copy. */}
      {(['top-4 left-4 border-t-2 border-l-2', 'top-4 right-4 border-t-2 border-r-2', 'bottom-4 left-4 border-b-2 border-l-2', 'bottom-4 right-4 border-b-2 border-r-2'] as const).map(
        (pos) => (
          <div key={pos} className={`absolute h-8 w-8 border-accent-info/40 ${pos}`} />
        )
      )}

      <div className="flex w-full max-w-md flex-col items-center px-6 text-center">
        <h1 className="briefing-glow font-display text-5xl tracking-[0.3em] text-accent-success animate-fade-up">
          IRIS
        </h1>
        <p className="mt-2 text-[11px] uppercase tracking-[0.35em] text-text-secondary animate-fade-up">
          {t('boot.subtitle')}
        </p>

        <div className="mt-8 h-1 w-full overflow-hidden rounded bg-bg-tertiary">
          <div
            className="h-full bg-accent-success transition-[width] duration-300 ease-out"
            style={{ width: `${fillPct}%`, boxShadow: '0 0 8px rgba(47,191,113,0.7)' }}
          />
        </div>

        <div className="mt-5 flex w-full flex-col gap-1.5 text-xs">
          {STATUS_LINES.map((line, i) => {
            const shown = i < visibleLines
            return (
              <div
                key={line}
                className={`flex items-center justify-between uppercase tracking-wide transition-opacity duration-300 ${
                  shown ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <span className="text-text-secondary">{line}</span>
                <span className="text-accent-success">[ OK ]</span>
              </div>
            )
          })}
        </div>

        <p
          className={`mt-6 font-display text-sm font-bold uppercase tracking-[0.3em] text-accent-success transition-opacity duration-300 ${
            granted ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {t('boot.accessGranted')}
        </p>

        <p className="mt-10 text-[10px] uppercase tracking-widest text-text-muted">
          {t('boot.skipHint')}
        </p>
      </div>
    </div>
  )
}

export function shouldShowBootSequence(): boolean {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(SESSION_KEY) !== 'true'
}
