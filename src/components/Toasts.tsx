import { sky, useSky } from '../state/store'

export function Toasts() {
  const toast = useSky(s => s.toast)
  const shared = useSky(s => s.shared)
  return (
    <div className="notices" aria-live="polite">
      {shared && (
        <div className="notice">
          <span>
            You are looking at <b>a shared sky</b>
          </span>
          <button type="button" className="pill pill--primary" onClick={sky.keepShared}>
            Add to my sky
          </button>
          <button type="button" className="pill" onClick={sky.leaveShared}>
            Back to my sky
          </button>
        </div>
      )}
      {toast && (
        <p key={toast.id} className="toast">
          {toast.text}
        </p>
      )}
    </div>
  )
}
