import { History, Monitor, Moon, RefreshCw, Sun } from 'lucide-react'
import { API_BASE } from '../api'
import type { ThemeMode } from '../hooks/useTheme'
import { ChainBadge } from './AuditBadge'
import { BrandMark } from './Brand'
import { Spinner } from './ui'
import { cx } from '../lib/cx'

export type ServerState = { state: 'checking' | 'ready' | 'down'; provider?: string; detail?: string }

const NEXT: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon }

export function Header({
  server,
  onRetry,
  theme,
  onTheme,
  onHistory,
  ledgerKey,
}: {
  server: ServerState
  onRetry: () => void
  theme: ThemeMode
  onTheme: (m: ThemeMode) => void
  onHistory: () => void
  ledgerKey: unknown
}) {
  const ThemeIcon = THEME_ICON[theme]
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-3 px-4 lg:px-6">
        <button
          type="button"
          onClick={onHistory}
          aria-label="Open history"
          className="grid size-10 place-items-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink xl:hidden"
        >
          <History className="size-5" />
        </button>
        <a href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg">
          <BrandMark className="size-8 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg leading-tight font-semibold tracking-tight text-ink">SpectraSource</span>
            <span className="hidden text-xs leading-tight text-ink-muted sm:block">One source, every format, a verifiable trail</span>
          </span>
        </a>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ServerPill server={server} onRetry={onRetry} />
          {server.state === 'ready' && <ChainBadge refreshKey={ledgerKey} />}
          <button
            type="button"
            onClick={() => onTheme(NEXT[theme])}
            aria-label={`Theme: ${theme}. Switch to ${NEXT[theme]}`}
            title={`Theme: ${theme}`}
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
          <span className="sr-only md:hidden">{mock ? 'Demo AI (offline mock)' : 'Server online'}</span>
        </>
      )}
    </span>
  )
}
