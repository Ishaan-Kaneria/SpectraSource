import { AnimatePresence, motion } from 'motion/react'
import { FileText, Plus, RefreshCw, X } from 'lucide-react'
import { memo, useEffect, useRef } from 'react'
import { FORMAT_STYLE } from '../lib/formats'
import { timeAgo } from '../lib/time'
import { labelFor, type JobSummary } from '../types'
import { Button, Spinner, StatusDot } from './ui'
import { cx } from '../lib/cx'

type Props = {
  jobs: JobSummary[] | null
  error: string | null
  activeId: number | null
  onSelect: (id: number, moveFocus?: boolean) => void
  onNew: () => void
  onRefresh: () => void
}

function HistoryList({ jobs, error, activeId, onSelect, onNew, onRefresh, onClose }: Props & { onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 className="text-xs font-semibold tracking-wider text-ink-muted uppercase">History</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh history"
            className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <RefreshCw className="size-4" />
          </button>
          <Button size="sm" onClick={onNew}>
            <Plus className="size-4" /> New
          </Button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close history"
              className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {error ? (
          <p className="px-2 py-6 text-sm text-ink-muted">Couldn't load history. {error}</p>
        ) : jobs === null ? (
          <div className="flex items-center gap-2 px-2 py-6 text-sm text-ink-muted">
            <Spinner className="size-4" /> Loading…
          </div>
        ) : jobs.length === 0 ? (
          <div className="mx-2 rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">
            <FileText className="mx-auto mb-2 size-6 text-ink-subtle" />
            Nothing yet. Your generated packs will be listed here.
          </div>
        ) : (
          <ul className="space-y-1">
            {jobs.map((j) => {
              const title = j.source_name || j.source_preview?.split(/[.\n]/)[0] || `Job #${j.id}`
              return (
                <li key={j.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(j.id)}
                    aria-current={activeId === j.id ? 'true' : undefined}
                    className={cx(
                      'group w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                      activeId === j.id ? 'border-brand/50 bg-brand-soft' : 'border-transparent hover:bg-surface-2',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <StatusDot status={j.status} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{title}</span>
                      <span className="shrink-0 text-[11px] text-ink-muted">{timeAgo(j.created_at)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 pl-4">
                      <div className="flex min-w-0 flex-wrap items-center gap-1">
                        <span className="mr-1 font-mono text-[11px] text-ink-muted">#{j.id}</span>
                        {j.output_types.slice(0, 7).map((t) => {
                          const S = FORMAT_STYLE[t]
                          if (!S) return null
                          return <S.icon key={t} className={cx('size-3.5 shrink-0', S.text)} aria-hidden />
                        })}
                        <span className="sr-only">
                          , {j.output_types.length} formats: {j.output_types.map(labelFor).join(', ')}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export const HistorySidebar = memo(function HistorySidebar(props: Props & { open: boolean; onClose: () => void }) {
  const { open, onClose, onSelect, onNew } = props
  const panel = useRef<HTMLDivElement>(null)

  // Modal drawer: trap Tab inside, close on Escape, lock page scroll, give focus back on close.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const focusables = () =>
      Array.from(panel.current?.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])') ?? [])
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => focusables()[0]?.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      opener?.focus()
    }
  }, [open, onClose])

  const pick = (id: number) => {
    onSelect(id, true)
    onClose()
  }
  const fresh = () => {
    onNew()
    onClose()
  }

  return (
    <>
      <aside
        aria-label="History"
        className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-72 shrink-0 border-r border-line bg-surface/60 min-[1440px]:block"
      >
        <HistoryList {...props} onClose={undefined} />
      </aside>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 min-[1440px]:hidden">
            <motion.div
              className="absolute inset-0 bg-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label="History"
              className="absolute inset-y-0 left-0 w-[min(20rem,88vw)] border-r border-line bg-surface shadow-pop"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            >
              <HistoryList {...props} onSelect={pick} onNew={fresh} onClose={onClose} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
})
