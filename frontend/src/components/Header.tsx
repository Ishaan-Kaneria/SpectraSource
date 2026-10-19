import { History, Moon, RefreshCw, Sun } from 'lucide-react'
import { API_BASE } from '../api'
import { ChainBadge } from './AuditBadge'
import { BrandMark } from './Brand'
import { Spinner } from './ui'
import { cx } from '../lib/cx'

export type ServerState = { state: 'checking' | 'ready' | 'down'; provider?: string; detail?: string }

export function Header({
  server,
  onRetry,
  dark,
  onToggleTheme,
  onHistory,
  historyOpen,
  ledgerKey,
}: {
  server: ServerState
  onRetry: () => void
  dark: boolean
  onToggleTheme: () => void
  onHistory: () => void
  historyOpen: boolean
  ledgerKey: unknown
}) {
  const ThemeIcon = dark ? Sun : Moon
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
        <button
          type="button"
          onClick={onHistory}
          aria-label="Open history"
          aria-expanded={historyOpen}
          aria-haspopup="dialog"
          className="grid size-10 place-items-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink min-[1440px]:hidden"
        >
          <History className="size-5" />
        </button>
        <a href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg">
          <BrandMark className="size-7 shrink-0 sm:size-8" />
          <span className="min-w-0">
            <span className="block truncate font-display text-base leading-tight font-semibold tracking-tight text-ink sm:text-lg">SpectraSource</span>
            <span className="hidden text-xs leading-tight text-ink-muted sm:block">One source, every format, a verifiable trail</span>
          </span>
        </a>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ServerPill server={server} onRetry={onRetry} />
          {server.state === 'ready' && <ChainBadge refreshKey={ledgerKey} />}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={dark ? 'Light theme' : 'Dark theme'}
            className="grid size-10 place-items-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <ThemeIcon className="size-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

function ServerPill({ server, onRetry }: { server: ServerState; onRetry: () => void }) {
  if (server.state === 'down') {
    return (
      <button
        type="button"
        onClick={onRetry}
        title={server.detail}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-bad/40 bg-bad-soft px-3 text-xs font-medium text-bad-ink hover:border-bad"
      >
        <RefreshCw className="size-3.5" /> <span className="hidden sm:inline">Server offline,</span> retry
      </button>
    )
  }
  const mock = server.provider === 'mock'
  return (
    <span
      title={API_BASE}
      role="status"
      className={cx(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium md:px-3',
        server.state === 'checking' ? 'border-warn/40 bg-warn-soft text-warn-ink' : 'border-line bg-surface-2 text-ink-muted',
      )}
    >
      {server.state === 'checking' ? (
        <>
          <Spinner className="size-3.5" />
          <span className="hidden sm:inline">Waking server…</span>
          <span className="sr-only sm:hidden">Waking server</span>
        </>
      ) : (
        <>
          <span aria-hidden className={cx('size-2 rounded-full', mock ? 'bg-warn' : 'bg-ok')} />
          <span className="hidden md:inline">{mock ? 'Demo AI (offline mock)' : `AI: ${server.provider}`}</span>
          <span className="md:hidden">{mock ? 'Demo' : 'Live'}</span>
          <span className="sr-only md:hidden">{mock ? 'AI (offline mock)' : 'server online'}</span>
        </>
      )}
    </span>
  )
}
