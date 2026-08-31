import { IconAlert, IconBulb, IconCheck, IconX } from './icons'

interface ToastProps {
  message: string
  variant?: 'success' | 'danger' | 'warning' | 'info'
  onClose?: () => void
}

const VARIANT_STYLE = {
  success: {
    colorClasses: 'border-accent-success/50 text-accent-success shadow-[0_0_20px_rgb(var(--glow-success)/0.25)]',
    Icon: IconCheck,
  },
  danger: {
    colorClasses: 'border-accent-danger/50 text-accent-danger shadow-[0_0_20px_rgb(var(--glow-danger)/0.25)]',
    Icon: IconX,
  },
  warning: {
    colorClasses: 'border-accent-warning/50 text-accent-warning shadow-[0_0_20px_rgba(255,107,53,0.25)]',
    Icon: IconAlert,
  },
  info: {
    colorClasses: 'border-accent-info/50 text-accent-info shadow-[0_0_20px_rgb(var(--glow-info)/0.25)]',
    Icon: IconBulb,
  },
} as const

export default function Toast({ message, variant = 'success', onClose }: ToastProps) {
  // A translucent "glass" HUD chip -- backdrop-blur over the scene
  // instead of a solid tinted panel -- matching the reference room's own
  // floating readouts (its HUD chip and mentor popover), so a mentor hint
  // reads as part of the console overlay rather than a boxed alert.
  const { colorClasses, Icon } = VARIANT_STYLE[variant]

  return (
    <div
      className={`fixed bottom-5 right-5 flex items-center gap-2 border bg-black/70 backdrop-blur-md px-4 py-3 rounded text-xs z-50 animate-[slideIn_0.4s_ease-out] ${colorClasses}`}
      onClick={onClose}
    >
      <Icon className="shrink-0" />
      {message}
    </div>
  )
}
