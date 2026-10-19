import { useEffect, useState } from 'react'
import { createJob, getJob } from './api'
import { ContentView } from './components/ContentView'
import { OUTPUT_TYPES, labelFor, type GenerationParams, type Job, type OutputType } from './types'

const DEFAULT_PARAMS: GenerationParams = {
  audience: 'general public',
  tone: 'professional',
  language: 'English',
  detail_level: 'medium',
  objective: 'inform',
  style: 'clear and factual',
}

const PARAM_FIELDS: { key: keyof GenerationParams; label: string; options: string[] }[] = [
  { key: 'audience', label: 'Target audience', options: ['general public', 'senior leadership', 'IT / SOC teams', 'policy makers', 'students'] },
  { key: 'tone', label: 'Tone', options: ['professional', 'urgent', 'reassuring', 'conversational', 'formal'] },
  { key: 'language', label: 'Language', options: ['English', 'Hindi', 'Gujarati', 'Tamil', 'Bengali', 'Marathi'] },
  { key: 'detail_level', label: 'Level of detail', options: ['brief', 'medium', 'detailed'] },
  { key: 'objective', label: 'Objective', options: ['inform', 'warn', 'persuade', 'educate', 'call to action'] },
  { key: 'style', label: 'Content style', options: ['clear and factual', 'storytelling', 'data-driven', 'bullet-heavy'] },
]

const statusColor: Record<string, string> = {
  pending: 'bg-slate-200 text-slate-700',
  running: 'bg-amber-100 text-amber-800',
  done: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
}

export default function App() {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [selected, setSelected] = useState<OutputType[]>(['executive_summary', 'linkedin'])
  const [params, setParams] = useState<GenerationParams>(DEFAULT_PARAMS)
  const [job, setJob] = useState<Job | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Poll until every artefact has finished.
  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'failed') return
    const t = setTimeout(() => getJob(job.id).then(setJob).catch((e) => setError(String(e.message ?? e))), 1500)
    return () => clearTimeout(t)
  }, [job])

  const toggle = (t: OutputType) =>
    setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const j = await createJob({ text, file, outputTypes: selected, params })
      setJob(j)
      setActive(j.artifacts[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const current = job?.artifacts.find((a) => a.id === active) ?? job?.artifacts[0]
  const canSubmit = selected.length > 0 && (text.trim() || file) && !submitting

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-slate-900">SpectraSource</h1>
          <span className="text-sm text-slate-500">One source, every format</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="space-y-5 rounded-xl bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Source content</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Paste an article, advisory, report or prompt..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.html"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5"
            />
            <p className="mt-1 text-xs text-slate-500">PDF, DOCX or text. Image and video input are coming next.</p>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">Output formats</span>
            <div className="grid grid-cols-2 gap-2">
              {OUTPUT_TYPES.map((o) => (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    selected.includes(o.id) ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="accent-indigo-600" />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PARAM_FIELDS.map((f) => (
              <label key={f.key} className="text-sm">
                <span className="mb-1 block text-slate-600">{f.label}</span>
                <select
                  value={params[f.key]}
                  onChange={(e) => setParams({ ...params, [f.key]: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5"
                >
                  {f.options.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : `Generate ${selected.length} format${selected.length === 1 ? '' : 's'}`}
          </button>
        </form>

        <section className="min-w-0 rounded-xl bg-white p-5 shadow-sm">
          {!job ? (
            <div className="flex h-full min-h-64 items-center justify-center text-sm text-slate-500">
              Generated outputs will appear here.
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {job.artifacts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setActive(a.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                      current?.id === a.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'
                    }`}
                  >
                    {labelFor(a.output_type)}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[a.status]}`}>{a.status}</span>
                  </button>
                ))}
              </div>
              {current?.status === 'done' && current.content ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate" title={current.content_hash ?? ''}>SHA-256 {current.content_hash?.slice(0, 16)}...</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(current.content, null, 2))}
                      className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <ContentView value={current.content} />
                </>
              ) : current?.status === 'failed' ? (
                <p className="text-sm text-red-700">{current.error}</p>
              ) : (
                <p className="text-sm text-slate-500">Generating...</p>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
