interface ToastProps {
  message: string
  variant?: 'success' | 'danger'
  onClose?: () => void
}

export default function Toast({ message, variant = 'success', onClose }: ToastProps) {
  const colorClasses =
    variant === 'danger'
      ? 'bg-accent-danger/10 border-accent-danger text-accent-danger'
      : 'bg-accent-success/10 border-accent-success text-accent-success'

  return (
    <div
      className={`fixed bottom-5 right-5 border px-4 py-3 rounded text-xs z-50 animate-[slideIn_0.4s_ease-out] ${colorClasses}`}
      onClick={onClose}
    >
      {variant === 'success' ? '✓ ' : '✗ '}
      {message}
    </div>
  )
}
