import { MotionConfig } from 'motion/react'
import { ArrowRight, CircleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createJob, getJob, health, listJobs } from './api'
import { FormatPicker } from './components/FormatPicker'
import { Header, type ServerState } from './components/Header'
import { HistorySidebar } from './components/HistorySidebar'
import { ParamsPanel } from './components/ParamsPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { SourceInput } from './components/SourceInput'
import { Button, Card, Spinner } from './components/ui'
import { useTheme } from './hooks/useTheme'
import { DEFAULT_PARAMS } from './lib/params'
import type { GenerationParams, Job, JobSummary, OutputType } from './types'

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))
const DEFAULT_FORMATS: OutputType[] = ['presentation', 'advisory', 'executive_summary', 'linkedin']

export default function App() {
  const { dark, toggle: toggleTheme } = useTheme()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [selected, setSelected] = useState<OutputType[]>(DEFAULT_FORMATS)
  const [params, setParams] = useState<GenerationParams>(DEFAULT_PARAMS)
  const [job, setJob] = useState<Job | null>(null)
  const [loadingJob, setLoadingJob] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [server, setServer] = useState<ServerState>({ state: 'checking' })
  const [history, setHistory] = useState<JobSummary[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const results = useRef<HTMLDivElement>(null)
  const closeDrawer = useCallback(() => setDrawer(false), [])

  const pingServer = useCallback(() => {
    health()
      .then((h) => setServer({ state: 'ready', provider: h.llm_provider }))
      .catch((e) => setServer({ state: 'down', detail: msg(e) }))
  }, [])
  useEffect(pingServer, [pingServer])
  const checkServer = () => {
    setServer({ state: 'checking' })
    pingServer()
  }

  const refreshHistory = useCallback(() => {
    listJobs()
      .then((j) => {
        setHistory(j)
        setHistoryError(null)
      })
      .catch((e) => setHistoryError(msg(e)))
  }, [])
  useEffect(() => {
    if (server.state === 'ready') refreshHistory()
  }, [server.state, refreshHistory])

  // Keep history dots live while any listed job is still generating.
  const historyBusy = history?.some((j) => j.status === 'pending' || j.status === 'running') ?? false
  useEffect(() => {
    if (!historyBusy) return
    const t = setInterval(refreshHistory, 3000)
    return () => clearInterval(t)
  }, [historyBusy, refreshHistory])

  // Poll the open job until every output has finished, then refresh the history list.
  const jobId = job?.id
  const jobDone = job?.status === 'done' || job?.status === 'failed'
  useEffect(() => {
    if (jobId == null) return
    if (jobDone) {
      refreshHistory()
      return
    }
    let live = true
    const t = setInterval(() => {
      getJob(jobId)
        .then((j) => {
          if (!live) return
          setJob((cur) => (cur?.id === j.id ? j : cur))
          setPanelError(null)
        })
        .catch((e) => live && setPanelError(`Lost contact with the server: ${msg(e)} Retrying…`))
    }, 1200)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [jobId, jobDone, refreshHistory])

  // Bring the output pack into view, clear of the sticky header, and optionally move focus to it.
  const showResults = (moveFocus = true) =>
    setTimeout(() => {
      const el = results.current
      if (!el) return
      window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80) })
      if (moveFocus) el.querySelector<HTMLElement>('[data-results-heading]')?.focus({ preventScroll: true })
    }, 60)
  const [announce, setAnnounce] = useState('')

  const inFlight = useRef(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // The button stays focusable while unavailable (aria-disabled), so guard here.
    if (!canSubmit || inFlight.current) return
    inFlight.current = true
    setError(null)
    setPanelError(null)
    setSubmitting(true)
    try {
      const j = await createJob({ text, file, outputTypes: selected, params })
      setJob(j)
      refreshHistory()
      showResults()
    } catch (err) {
      setError(msg(err))
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  // Ignore a slow response for a job the user has already clicked away from.
  const openRequest = useRef(0)
  // From the phone drawer, focus follows the pack; from the desktop list it stays on the row.
  const openJob = useCallback((id: number, moveFocus = false) => {
    const req = ++openRequest.current
    setLoadingJob(true)
    setPanelError(null)
    getJob(id)
      .then((j) => {
        if (req !== openRequest.current) return
        setJob(j)
        setSelected(j.artifacts.map((a) => a.output_type))
        setParams({ ...DEFAULT_PARAMS, ...j.params })
        setAnnounce(`Opened pack #${j.id}, ${j.artifacts.length} formats`)
        showResults(moveFocus)
      })
      .catch((e) => {
        if (req !== openRequest.current) return
        setPanelError(`Couldn't open job #${id}: ${msg(e)}`)
        showResults(moveFocus)
      })
      .finally(() => req === openRequest.current && setLoadingJob(false))
  }, [])

  const newJob = useCallback(() => {
    openRequest.current++
    setJob(null)
    setText('')
    setFile(null)
    setSelected(DEFAULT_FORMATS)
    setParams(DEFAULT_PARAMS)
    setError(null)
    setPanelError(null)
    setLoadingJob(false)
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => document.getElementById('source-text')?.focus({ preventScroll: true }))
  }, [])

  // Enter on a format tile or detail option shouldn't submit the whole form; let it toggle the tile instead.
  const onFormKey = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const t = e.target as HTMLInputElement
    if (e.key !== 'Enter' || t.tagName !== 'INPUT' || (t.type !== 'checkbox' && t.type !== 'radio')) return
    e.preventDefault()
    if (t.type === 'checkbox') t.click()
  }

  const hasSource = Boolean(text.trim() || file)
  const jobRunning = job != null && !jobDone
  const doneCount = job?.artifacts.filter((a) => a.status === 'done' || a.status === 'failed').length ?? 0
  const canSubmit = selected.length > 0 && hasSource && !submitting && !jobRunning && server.state !== 'down'
  const why = !hasSource
    ? job
      ? `Viewing pack #${job.id}. Add a source to make a new one.`
      : 'Add a file or paste text to begin'
    : selected.length === 0
      ? 'Pick at least one format'
      : null

  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#composer"
        className="sr-only z-50 rounded-lg bg-brand px-3 py-2 text-on-brand focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Header
        server={server}
        onRetry={checkServer}
        dark={dark}
        onToggleTheme={toggleTheme}
        onHistory={() => setDrawer(true)}
        historyOpen={drawer}
        ledgerKey={`${job?.id}-${job?.status}`}
      />
      <div className="mx-auto flex max-w-[1680px]">
        <HistorySidebar
          jobs={history}
          error={server.state === 'down' ? 'The server is offline.' : historyError}
          activeId={job?.id ?? null}
          onSelect={openJob}
          onNew={newJob}
          onRefresh={refreshHistory}
          open={drawer}
          onClose={closeDrawer}
        />
        <main className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] items-start gap-5 p-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-6 lg:p-6 2xl:grid-cols-[26rem_minmax(0,1fr)]">
          <h1 className="sr-only">SpectraSource: turn one source into every format</h1>
          <form id="composer" onSubmit={submit} onKeyDown={onFormKey} tabIndex={-1} className="min-w-0 focus:outline-none" aria-label="Create an output pack">
            <Card className="space-y-6 p-4 sm:p-5">
              <SourceInput text={text} onText={setText} file={file} onFile={setFile} />
              <FormatPicker selected={selected} onChange={setSelected} />
              <ParamsPanel params={params} onChange={setParams} />

              {error && (
                <p role="alert" className="flex gap-2 rounded-xl border border-bad/40 bg-bad-soft p-3 text-sm text-bad-ink">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span className="break-words">{error}</span>
                </p>
              )}

              <div className="sticky bottom-0 z-10 -mx-4 -mb-4 rounded-b-2xl border-t border-line bg-surface p-4 shadow-[0_-8px_16px_-12px_rgb(0_0_0/0.25)] sm:-mx-5 sm:-mb-5 sm:p-5">
                <Button type="submit" variant="primary" size="lg" aria-disabled={!canSubmit} className="w-full" aria-describedby="submit-why">
                  {submitting ? (
                    <>
                      <Spinner className="size-5" /> Uploading…
                    </>
                  ) : jobRunning ? (
                    <>
                      <Spinner className="size-5" /> Generating {doneCount} of {job.artifacts.length}…
                    </>
                  ) : (
                    <>
                      Generate {selected.length} format{selected.length === 1 ? '' : 's'}
                      <ArrowRight className="size-5" aria-hidden />
                    </>
                  )}
                </Button>
                <p id="submit-why" className="mt-2 text-center text-xs text-ink-muted">
                  {server.state === 'down'
                    ? 'The server is offline. Use retry at the top.'
                    : jobRunning ? (
                      <>
                        This pack keeps running in history.{' '}
                        <button type="button" onClick={newJob} className="font-medium text-brand-ink underline underline-offset-2">
                          Start a new pack
                        </button>
                      </>
                    ) : (
                      (why ?? 'Each format takes a few seconds.')
                    )}
                </p>
              </div>
            </Card>
          </form>

          <div ref={results} className="min-w-0 space-y-3 [overflow-anchor:none]">
            {panelError && (
              <p role="alert" className="flex gap-2 rounded-xl border border-bad/40 bg-bad-soft p-3 text-sm text-bad-ink">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="break-words">{panelError}</span>
              </p>
            )}
            <ResultsPanel job={job} loading={loadingJob} onNew={newJob} />
            <p className="sr-only" aria-live="polite">
              {announce}
            </p>
          </div>
        </main>
      </div>
    </MotionConfig>
  )
}
