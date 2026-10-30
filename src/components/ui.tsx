import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cx } from './cx'

interface ToolProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  primary?: boolean
  /** Keep the text visible even on narrow screens. */
  keepLabel?: boolean
  title?: string
}

export function Tool({ icon: Icon, label, onClick, active, disabled, primary, keepLabel, title }: ToolProps) {
  return (
    <button
      type="button"
      className={cx('tool', primary && 'tool--primary', active && 'tool--active', keepLabel && 'tool--keep')}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={title ?? label}
    >
      <Icon size={16} strokeWidth={1.7} aria-hidden />
      <span className="tool__label">{label}</span>
    </button>
  )
}

export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <section className="sheet" aria-label={title}>
      <header className="sheet__head">
        <h2>{title}</h2>
        <button type="button" className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>
      {children}
    </section>
  )
}
