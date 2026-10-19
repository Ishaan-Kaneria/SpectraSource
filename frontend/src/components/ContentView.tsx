// Renders any artefact's structured JSON as readable sections. Type-specific
// renderers (slides, storyboard, infographic preview) can replace this per output type.
const humanize = (k: string) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export function ContentView({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object') {
    return <p className="whitespace-pre-wrap text-slate-800">{String(value)}</p>
  }
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== 'object')) {
      return (
        <ul className="list-disc space-y-1 pl-5 text-slate-800">
          {value.map((v, i) => (
            <li key={i}>{String(v)}</li>
          ))}
        </ul>
      )
    }
    return (
      <div className="space-y-3">
        {value.map((v, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <ContentView value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <section key={k}>
          <h4 className={depth === 0 ? 'mb-1 text-sm font-semibold text-slate-900' : 'text-xs font-medium uppercase tracking-wide text-slate-500'}>
            {humanize(k)}
          </h4>
          <ContentView value={v} depth={depth + 1} />
        </section>
      ))}
    </div>
  )
}
