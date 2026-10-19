import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { STATUS_LABEL, cx } from '../lib/cx'

type Variant = 'primary' | 'secondary' | 'ghost'
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-on-brand shadow-sm hover:bg-brand-strong active:translate-y-px disabled:bg-surface-3 disabled:text-ink-muted disabled:shadow-none aria-disabled:cursor-not-allowed aria-disabled:bg-surface-3 aria-disabled:text-ink-muted aria-disabled:shadow-none aria-disabled:active:translate-y-0',
  secondary:
    'border border-line-strong bg-surface text-ink hover:bg-surface-2 active:translate-y-px disabled:text-ink-muted aria-disabled:cursor-not-allowed aria-disabled:text-ink-muted aria-disabled:opacity-60',
  ghost: 'text-ink-muted hover:bg-surface-2 hover:text-ink disabled:text-ink-subtle',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,color,transform,box-shadow] duration-150 disabled:cursor-not-allowed',
        size === 'sm' && 'h-8 px-2.5 text-xs',
        size === 'md' && 'h-10 px-3.5 text-sm',
        size === 'lg' && 'h-12 px-5 text-base',
        VARIANTS[variant],
        className,
      )}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl border border-line bg-surface shadow-card', className)}>{children}</div>
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden className={cx('animate-spin', className)} />
}

export function SectionTitle({ step, title, hint }: { step?: number; title: string; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        {step != null && (
          <span className="grid size-5 place-items-center rounded-full bg-brand-soft font-mono text-[11px] font-semibold text-brand-ink">
            {step}
          </span>
        )}
        {title}
      </h2>
      {hint && <div className="text-xs text-ink-muted">{hint}</div>}
    </div>
  )
}

export function StatusDot({ status }: { status: keyof typeof STATUS_LABEL }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-block size-2 shrink-0 rounded-full',
        status === 'done' && 'bg-ok',
        status === 'failed' && 'bg-bad',
        status === 'running' && 'animate-pulse bg-warn',
        status === 'pending' && 'bg-ink-subtle/60',
      )}
    />
  )
}
