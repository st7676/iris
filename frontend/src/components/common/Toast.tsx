interface ToastProps {
  message: string
  variant?: 'success' | 'danger'
  onClose?: () => void
}

export default function Toast({ message, variant = 'success', onClose }: ToastProps) {
  // A translucent "glass" HUD chip -- backdrop-blur over the scene
  // instead of a solid tinted panel -- matching the reference room's own
  // floating readouts (its HUD chip and mentor popover), so a mentor hint
  // reads as part of the console overlay rather than a boxed alert.
  const colorClasses =
    variant === 'danger'
      ? 'border-accent-danger/50 text-accent-danger shadow-[0_0_20px_rgb(var(--glow-danger)/0.25)]'
      : 'border-accent-success/50 text-accent-success shadow-[0_0_20px_rgb(var(--glow-success)/0.25)]'

  return (
    <div
      className={`fixed bottom-5 right-5 border bg-black/70 backdrop-blur-md px-4 py-3 rounded text-xs z-50 animate-[slideIn_0.4s_ease-out] ${colorClasses}`}
      onClick={onClose}
    >
      {variant === 'success' ? '✓ ' : '✗ '}
      {message}
    </div>
  )
}
