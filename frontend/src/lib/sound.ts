// Lightweight sound-effect layer for the "cold SOC console" theme --
// synthesized tones via the Web Audio API rather than shipped audio
// files, so there's nothing to download, license, or bundle. Every sound
// here is a short beep/blip/chime built from oscillators, matching the
// terminal/HUD aesthetic (think old modem/radar beeps, not music).
//
// Muted by default is deliberately NOT the choice here: the very first
// sound-producing action in the app is submitting the login form, which
// is itself a user gesture, so the AudioContext unlocks cleanly without
// ever needing a dedicated "click to enable audio" step. A mute toggle
// (see LiveStatusBar) still lets anyone turn it off and have that stick.

const STORAGE_KEY = 'iris-sound-enabled'

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  return ctx
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

export function setSoundEnabled(enabled: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, String(enabled))
  window.dispatchEvent(new CustomEvent('iris-sound-changed', { detail: enabled }))
}

// One short oscillator "note" -- a sine/square/triangle tone that fades
// in fast and decays exponentially, so it reads as a discrete blip
// rather than a harsh on/off click.
function tone(
  frequency: number,
  duration: number,
  { type = 'sine' as OscillatorType, gain = 0.12, delay = 0 } = {},
): void {
  if (!isSoundEnabled()) return
  const audioCtx = getContext()
  if (!audioCtx) return

  const osc = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime + delay)

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay)
  gainNode.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + delay + 0.012)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration)

  osc.connect(gainNode).connect(audioCtx.destination)
  osc.start(audioCtx.currentTime + delay)
  osc.stop(audioCtx.currentTime + delay + duration + 0.05)
}

/** Soft UI click -- hotspot/button presses. */
export function playClick(): void {
  tone(720, 0.05, { type: 'square', gain: 0.05 })
}

/** Two-note ascending confirm -- successful investigate/decide/login. */
export function playSuccess(): void {
  tone(520, 0.09, { gain: 0.09 })
  tone(780, 0.12, { gain: 0.09, delay: 0.07 })
}

/** Low descending buzz -- errors, failed actions, danger toasts. */
export function playError(): void {
  tone(220, 0.16, { type: 'sawtooth', gain: 0.08 })
  tone(160, 0.2, { type: 'sawtooth', gain: 0.07, delay: 0.09 })
}

/** Single urgent double-beep -- warnings / idle nudge / security alert. */
export function playAlert(): void {
  tone(880, 0.09, { type: 'square', gain: 0.07 })
  tone(880, 0.09, { type: 'square', gain: 0.07, delay: 0.14 })
}

/** Gentle upward chime -- mentor hints, informational toasts. */
export function playChime(): void {
  tone(660, 0.14, { type: 'triangle', gain: 0.08 })
  tone(990, 0.18, { type: 'triangle', gain: 0.07, delay: 0.09 })
}

/** One short terminal "keystroke" tick, for the boot-sequence typewriter. */
export function playTick(): void {
  tone(1200 + Math.random() * 200, 0.02, { type: 'square', gain: 0.025 })
}

/** Rising sweep played once boot finishes -- "systems online". */
export function playBootComplete(): void {
  tone(440, 0.1, { gain: 0.1 })
  tone(660, 0.1, { gain: 0.1, delay: 0.09 })
  tone(880, 0.22, { gain: 0.11, delay: 0.18 })
}
