import { useSky } from '../state/store'

export function Toasts() {
  const toast = useSky(s => s.toast)
  return (
    <div className="notices" aria-live="polite">
      {toast && (
        <p key={toast.id} className="toast">
          {toast.text}
        </p>
      )}
    </div>
  )
}
