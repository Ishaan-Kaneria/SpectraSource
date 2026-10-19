import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Braces, Check, ChevronDown, CircleAlert, Copy, Download, Eye, FileText, Fingerprint, Layers } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { downloadUrl } from '../api'
import { FORMAT_STYLE } from '../lib/formats'
import { toPlainText } from '../lib/plaintext'
import { timeAgo } from '../lib/time'
import { OUTPUT_TYPES, labelFor, shortLabelFor, type Artifact, type Job } from '../types'
import { ArtifactBadge } from './AuditBadge'
import { BrandMark } from './Brand'
import { Popover } from './Popover'
import { Preview } from './previews'
import { Button, Card, Spinner } from './ui'
import { STATUS_LABEL, cx } from '../lib/cx'

const EXPORT_LABEL: Record<string, string> = {
  pptx: 'PowerPoint deck',
  docx: 'Word document',
  srt: 'Subtitles (SRT)',
  html: 'Web page (HTML)',
  md: 'Markdown',
}

const INTERRUPTED = 'Generation was interrupted before this format finished. Start a new pack to try again.'

export function ResultsPanel({ job, loading, onNew }: { job: Job | null; loading: boolean; onNew: () => void }) {
  if (!job) return loading ? <LoadingCard /> : <EmptyState />
  return <JobResults key={job.id} job={job} onNew={onNew} />
}

function JobResults({ job, onNew }: { job: Job; onNew: () => void }) {
  const [activeId, setActiveId] = useState<number>(job.artifacts[0]?.id)
  const [picked, setPicked] = useState(false)
  const tabs = useRef<HTMLDivElement>(null)

  // A finished job can't make progress, so anything still open was cut off (e.g. a server restart).
  const jobFinished = job.status === 'done' || job.status === 'failed'
  const arts = jobFinished
    ? job.artifacts.map((a) => (a.status === 'pending' || a.status === 'running' ? { ...a, status: 'failed' as const, error: INTERRUPTED } : a))
    : job.artifacts
  const interrupted = jobFinished && job.artifacts.some((a) => a.status === 'pending' || a.status === 'running')
  const done = arts.filter((a) => a.status === 'done').length
  const finished = arts.filter((a) => a.status === 'done' || a.status === 'failed').length
  const chosen = arts.find((a) => a.id === activeId) ?? arts[0]
  // Until the user picks a tab, follow the first finished output so something useful is on screen.
  const active = !picked && chosen?.status !== 'done' ? (arts.find((a) => a.status === 'done') ?? chosen) : chosen

  const select = (id: number) => {
    setActiveId(id)
    setPicked(true)
  }

  const onKey = (e: KeyboardEvent) => {
    const i = arts.findIndex((a) => a.id === active?.id)
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? arts.length - 1 : null
    if (n == null) return
    e.preventDefault()
    const next = arts[(n + arts.length) % arts.length]
    select(next.id)
    tabs.current?.querySelector<HTMLElement>(`[data-id="${next.id}"]`)?.focus()
  }

  const running = finished < arts.length

  return (
    <Card className="min-w-0">
      <div className="border-b border-line px-4 pt-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h2 data-results-heading tabIndex={-1} className="flex items-center gap-2 rounded text-sm font-semibold text-ink">
              <Layers className="size-4 text-brand-ink" aria-hidden /> Output pack
              <span className="font-mono text-xs font-normal text-ink-muted">#{job.id}</span>
            </h2>
            <p className="truncate text-xs text-ink-muted">
              {job.source_name ?? 'Pasted text'} · {job.source_kind} · {timeAgo(job.created_at)}
            </p>
          </div>
          <p className="text-xs font-medium text-ink-muted" role="status" aria-live="polite">
            {running ? (
              <span className="inline-flex items-center gap-1.5 text-warn-ink">
                <Spinner className="size-3.5" /> {done} of {arts.length} ready
              </span>
            ) : (
              <span className={done === arts.length ? 'text-ok-ink' : 'text-warn-ink'}>
                {done} of {arts.length} ready{arts.length - done > 0 ? `, ${arts.length - done} failed` : ''}
              </span>
            )}
          </p>
        </div>
        {interrupted && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warn/40 bg-warn-soft px-3 py-2 text-xs text-warn-ink">
            <span>This pack stopped before every format finished.</span>
            <Button size="sm" onClick={onNew}>
              Start a new pack
            </Button>
          </div>
        )}
        <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand),var(--color-accent))]"
            initial={{ width: 0 }}
            animate={{ width: `${(finished / Math.max(arts.length, 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
          {running && <span className="absolute inset-y-0 left-0 w-1/3 animate-scan bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.6),transparent)] motion-reduce:hidden" />}
        </div>

        <div
          ref={tabs}
          role="tablist"
          aria-label="Generated formats"
          onKeyDown={onKey}
          className="-mx-1 mt-3 grid gap-1 px-1 pb-2"
          style={{ gridTemplateColumns: `repeat(${arts.length}, minmax(0, 1fr))` }}
        >
          {arts.map((a) => {
            const S = FORMAT_STYLE[a.output_type]
            const sel = a.id === active?.id
            return (
              <button
                key={a.id}
                data-id={a.id}
                type="button"
                role="tab"
                id={`tab-${a.id}`}
                aria-selected={sel}
                aria-controls="artifact-panel"
                aria-label={`${labelFor(a.output_type)}, ${STATUS_LABEL[a.status]}`}
                title={labelFor(a.output_type)}
                tabIndex={sel ? 0 : -1}
                onClick={() => select(a.id)}
                className={cx(
                  'relative flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 pt-2.5 pb-2 transition-colors',
                  sel ? 'border-brand/60 bg-brand-soft' : 'border-transparent hover:bg-surface-2',
                )}
              >
                <span className={cx('relative grid size-8 place-items-center rounded-lg', S.chip)}>
                  <S.icon className="size-[18px]" aria-hidden />
                  <span className="absolute -top-1.5 -right-1.5">
                    <TabStatus status={a.status} />
                  </span>
                </span>
                <span className={cx('hidden w-full truncate text-center text-xs sm:block', sel ? 'font-semibold text-ink' : 'text-ink-muted')}>
                  {shortLabelFor(a.output_type)}
                </span>
                {sel && <motion.span layoutId="tab-underline" className={cx('absolute inset-x-3 -bottom-px h-0.5 rounded-full', S.bar)} />}
              </button>
            )
          })}
        </div>
      </div>

      <div id="artifact-panel" role="tabpanel" aria-labelledby={active ? `tab-${active.id}` : undefined} className="p-4 sm:p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${active?.id}-${active?.status}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.06 } }}
          >
            {active && <ArtifactBody artifact={active} job={job} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  )
}

function TabStatus({ status }: { status: Artifact['status'] }) {
  if (status === 'done')
    return (
      <span className="grid size-4 place-items-center rounded-full bg-ok text-white" aria-hidden>
        <Check className="size-2.5" strokeWidth={3.5} />
      </span>
    )
  if (status === 'failed') return <CircleAlert className="size-4 text-bad" aria-hidden />
  if (status === 'running') return <Spinner className="size-4 text-warn" />
  return <span aria-hidden className="block size-3 rounded-full border-2 border-ink-subtle/60" />
}

function ArtifactBody({ artifact, job }: { artifact: Artifact; job: Job }) {
  const [raw, setRaw] = useState(false)
  const [copied, setCopied] = useState(false)

  if (artifact.status === 'failed') {
    return (
      <div role="alert" className="rounded-xl border border-bad/40 bg-bad-soft p-4 text-sm text-bad-ink">
        <p className="mb-1 flex items-center gap-2 font-semibold">
          <CircleAlert className="size-4" /> {labelFor(artifact.output_type)} couldn't be generated
        </p>
        <p className="break-words">{artifact.error ?? 'Unknown error'}</p>
      </div>
    )
  }
  if (artifact.status !== 'done' || !artifact.content) return <GeneratingSkeleton artifact={artifact} jobActive={job.status === 'running'} />

  const content = artifact.content
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(artifact.output_type, content))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-base font-semibold text-ink">{labelFor(artifact.output_type)}</h3>
          <ArtifactBadge key={artifact.id} artifactId={artifact.id} fallbackHash={artifact.content_hash} />
        </div>
        <div className="flex items-center gap-1.5">
          <DownloadMenu artifact={artifact} />
          <Button size="sm" onClick={copy}>
            {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5 text-ink-muted" />}
            <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRaw((r) => !r)} aria-pressed={raw} aria-label="Show raw JSON">
            {raw ? <Eye className="size-3.5" /> : <Braces className="size-3.5" />}
            <span className="hidden sm:inline">{raw ? 'Preview' : 'JSON'}</span>
          </Button>
        </div>
      </div>
      {raw ? (
        <pre
          tabIndex={0}
          aria-label={`${labelFor(artifact.output_type)} as JSON`}
          className="max-h-[36rem] overflow-auto rounded-xl bg-surface-3 p-4 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-ink"
        >
          {JSON.stringify(content, null, 2)}
        </pre>
      ) : (
        <Preview artifact={artifact} job={job} />
      )}
    </div>
  )
}

function DownloadMenu({ artifact }: { artifact: Artifact }) {
  const formats = artifact.export_formats.filter((f) => f !== 'json')
  if (!formats.length) return null
  return (
    <Popover
      label="Download"
      triggerClassName="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-2.5 text-xs font-medium text-on-brand hover:bg-brand-strong"
      trigger={
        <>
          <Download className="size-3.5" aria-hidden /> Download <ChevronDown className="size-3.5" aria-hidden />
        </>
      }
    >
      <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">Export {labelFor(artifact.output_type).toLowerCase()}</p>
      <ul className="space-y-1">
        {formats.map((f) => (
          <li key={f}>
            <a
              href={downloadUrl(artifact.id, f)}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-ink hover:bg-surface-2"
            >
              <span className="grid h-7 w-12 place-items-center rounded-md bg-surface-3 font-mono text-[11px] font-semibold text-ink uppercase">{f}</span>
              {EXPORT_LABEL[f] ?? f.toUpperCase()}
              <Download className="ml-auto size-4 text-ink-muted" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </Popover>
  )
}

function GeneratingSkeleton({ artifact, jobActive }: { artifact: Artifact; jobActive: boolean }) {
  const S = FORMAT_STYLE[artifact.output_type]
  const still = useReducedMotion()
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="relative mb-4 grid size-16 place-items-center">
        {artifact.status === 'running' && !still && (
          <motion.span
            className="absolute inset-0 rounded-2xl border-2 border-brand/40"
            animate={{ scale: [1, 1.25], opacity: [0.8, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <span className={cx('grid size-14 place-items-center rounded-2xl', S.chip)}>
          <S.icon className="size-7" aria-hidden />
        </span>
      </div>
      <p className="text-sm font-semibold text-ink">
        {artifact.status === 'running'
          ? `Writing the ${labelFor(artifact.output_type).toLowerCase()}…`
          : jobActive
            ? `${labelFor(artifact.output_type)} is next in line…`
            : `${labelFor(artifact.output_type)} is queued`}
      </p>
      <p className="mt-1 max-w-xs text-xs text-ink-muted">
        The AI returns structured JSON, which is checked against the format's schema before it is shown and hashed into the ledger.
      </p>
      <div className="mt-6 w-full max-w-md space-y-2" aria-hidden>
        {[90, 70, 80].map((w, i) => (
          <div key={i} className="skeleton h-3 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

function LoadingCard() {
  return (
    <Card className="grid min-h-80 place-items-center p-8">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Spinner className="size-4" /> Loading output pack…
      </div>
    </Card>
  )
}

function EmptyState() {
  return (
    <Card className="relative overflow-hidden p-6 sm:p-10">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative mx-auto max-w-xl text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#0b1626] shadow-pop dark:bg-surface-3 dark:ring-1 dark:ring-line">
          <BrandMark className="size-9" />
        </span>
        <h2 data-results-heading tabIndex={-1} className="font-display text-2xl font-semibold tracking-tight text-balance text-ink sm:text-3xl">
          Turn one advisory into a complete communication pack
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
          Add a source on the left, choose formats and generate. Each output is schema-checked, hashed with SHA-256 and written to a
          tamper-evident ledger.
        </p>
      </div>

      <ol className="relative mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
        {[
          { icon: FileText, title: 'Ingest', text: 'PDF, DOCX, text, images, audio or video' },
          { icon: Layers, title: 'Transform', text: 'Seven audience-ready formats in one pass' },
          { icon: Fingerprint, title: 'Verify', text: 'Hash-chained audit trail for every output' },
        ].map((s, i) => (
          <li key={s.title} className="rounded-xl border border-line bg-surface-2 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand-ink">
                <s.icon className="size-4" aria-hidden />
              </span>
              <span className="font-mono text-xs text-ink-muted">0{i + 1}</span>
            </div>
            <p className="text-sm font-semibold text-ink">{s.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-ink-muted">{s.text}</p>
          </li>
        ))}
      </ol>

      <ul className="relative mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2" aria-label="Available formats">
        {OUTPUT_TYPES.map((o) => {
          const S = FORMAT_STYLE[o.id]
          return (
            <li key={o.id} className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', S.chip)}>
              <S.icon className="size-3.5" aria-hidden />
              <span className="text-ink">{o.label}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
