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

export default function App() {
  const { mode, setMode } = useTheme()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [selected, setSelected] = useState<OutputType[]>(['presentation', 'advisory', 'executive_summary', 'linkedin'])
  const [params, setParams] = useState<GenerationParams>(DEFAULT_PARAMS)
  const [job, setJob] = useState<Job | null>(null)
  const [loadingJob, setLoadingJob] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [server, setServer] = useState<ServerState>({ state: 'checking' })
  const [history, setHistory] = useState<JobSummary[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const results = useRef<HTMLDivElement>(null)

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
        .then((j) => live && setJob((cur) => (cur?.id === j.id ? j : cur)))
        .catch((e) => live && setError(msg(e)))
    }, 1200)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [jobId, jobDone, refreshHistory])

  const showResults = () => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const j = await createJob({ text, file, outputTypes: selected, params })
      setJob(j)
      refreshHistory()
      showResults()
    } catch (err) {
      setError(msg(err))
    } finally {
      setSubmitting(false)
    }
  }

  const openJob = useCallback((id: number) => {
    setLoadingJob(true)
    setError(null)
    getJob(id)
      .then((j) => {
        setJob(j)
        setSelected(j.artifacts.map((a) => a.output_type))
        setParams({ ...DEFAULT_PARAMS, ...j.params })
        showResults()
      })
      .catch((e) => setError(msg(e)))
      .finally(() => setLoadingJob(false))
  }, [])

  const newJob = () => {
    setJob(null)
    setText('')
    setFile(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const hasSource = Boolean(text.trim() || file)
  const canSubmit = selected.length > 0 && hasSource && !submitting && server.state !== 'down'
  const why = !hasSource ? 'Add a file or paste text to begin' : selected.length === 0 ? 'Pick at least one format' : null

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
        theme={mode}
        onTheme={setMode}
        onHistory={() => setDrawer(true)}
        ledgerKey={`${job?.id}-${job?.status}`}
      />
      <div className="mx-auto flex max-w-[1680px]">
        <HistorySidebar
          jobs={history}
          error={historyError}
          activeId={job?.id ?? null}
          onSelect={openJob}
          onNew={newJob}
          onRefresh={refreshHistory}
          open={drawer}
          onClose={() => setDrawer(false)}
        />
        <main className="grid min-w-0 flex-1 items-start gap-5 p-4 lg:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)] lg:gap-6 lg:p-6">
          <form id="composer" onSubmit={submit}>
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

              <div>
                <Button type="submit" variant="primary" size="lg" disabled={!canSubmit} className="w-full" aria-describedby="submit-why">
                  {submitting ? (
                    <>
                      <Spinner className="size-5" /> Uploading…
                    </>
                  ) : (
                    <>
                      Generate {selected.length} format{selected.length === 1 ? '' : 's'}
                      <ArrowRight className="size-5" aria-hidden />
                    </>
                  )}
                </Button>
                <p id="submit-why" className="mt-2 text-center text-xs text-ink-muted">
                  {server.state === 'down' ? 'The server is offline. Use retry at the top.' : (why ?? 'Takes a few seconds per format.')}
                </p>
              </div>
            </Card>
          </form>

          <div ref={results} className="min-w-0 scroll-mt-20">
            <ResultsPanel job={job} loading={loadingJob} />
          </div>
        </main>
      </div>
    </MotionConfig>
  )
}
