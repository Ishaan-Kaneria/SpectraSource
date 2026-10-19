import { ArrowRight, ExternalLink, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { arr, str, type Advisory, type ExecutiveSummary } from '../../lib/content'
import type { GenerationParams } from '../../types'
import { BrandMark } from '../Brand'
import { cx } from '../../lib/cx'

const SEVERITY: Record<string, string> = {
  critical: 'bg-bad text-white',
  high: 'bg-[#c2410c] text-white',
  medium: 'bg-warn text-[#1f1300]',
  low: 'bg-brand text-on-brand',
  informational: 'bg-surface-3 text-ink',
}

const today = (iso?: string) =>
  new Date(iso ? (/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`) : Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

function Sheet({ children }: { children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl rounded-lg border border-line bg-surface shadow-card">
      <div className="h-1.5 rounded-t-lg bg-[linear-gradient(90deg,var(--color-brand),var(--color-accent))]" />
      <div className="px-5 py-6 sm:px-10 sm:py-9">{children}</div>
    </article>
  )
}

function Heading({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <h4 className={cx('mb-2 border-b border-line pb-1.5 font-display text-base font-semibold text-ink', first ? 'mt-0' : 'mt-7')}>{children}</h4>
  )
}

export function AdvisoryPreview({ value, createdAt }: { value: Advisory; createdAt?: string }) {
  const sev = str(value.severity).toLowerCase()
  const refs = arr(value.references)
  return (
    <Sheet>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
              Security advisory
              <span className="rounded-sm bg-[#0b1626] px-1.5 py-0.5 font-mono text-[10px] tracking-normal text-white dark:bg-surface-3 dark:text-ink" title="Traffic Light Protocol: may be shared publicly">
                TLP:CLEAR
              </span>
            </p>
            <p className="font-mono text-sm text-ink">{str(value.advisory_id)}</p>
          </div>
        </div>
        <div className="sm:text-right">
          <span
            className={cx(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold tracking-wide uppercase',
              SEVERITY[sev] ?? SEVERITY.informational,
            )}
          >
            <ShieldAlert className="size-3.5" aria-hidden /> Severity: {str(value.severity)}
          </span>
          <p className="mt-1.5 text-xs text-ink-muted">Issued {today(createdAt)}</p>
        </div>
      </header>

      <h3 className="mt-6 font-display text-2xl leading-tight font-semibold text-balance text-ink">{str(value.title)}</h3>
      <p className="mt-4 rounded-r-lg border-l-4 border-brand bg-brand-soft px-4 py-3 text-sm leading-relaxed text-ink">{str(value.summary)}</p>

      {arr(value.affected).length > 0 && (
        <>
          <Heading>Affected</Heading>
          <ul className="flex flex-wrap gap-2">
            {arr(value.affected).map((a, i) => (
              <li key={i} className="rounded-md border border-line-strong bg-surface-2 px-2.5 py-1 text-sm text-ink">
                {a}
              </li>
            ))}
          </ul>
        </>
      )}

      {arr(value.sections).map((s, i) => (
        <section key={i}>
          <Heading>{str(s.heading)}</Heading>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">{str(s.content)}</p>
        </section>
      ))}

      <Heading>Recommended actions</Heading>
      <ol className="space-y-2">
        {arr(value.recommendations).map((r, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand font-mono text-xs font-semibold text-on-brand">{i + 1}</span>
            <span className="pt-0.5">{r}</span>
          </li>
        ))}
      </ol>

      {refs.length > 0 && (
        <>
          <Heading>References</Heading>
          <ul className="space-y-1 text-sm">
            {refs.map((r, i) => (
              <li key={i} className="break-words text-ink-muted">
                {/^https?:\/\//.test(r) ? (
                  <a href={r} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-ink underline-offset-2 hover:underline">
                    {r} <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : (
                  r
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}

export function SummaryPreview({ value, params, createdAt }: { value: ExecutiveSummary; params?: GenerationParams; createdAt?: string }) {
  return (
    <Sheet>
      <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">Executive summary</p>
      <h3 className="mt-2 font-display text-2xl leading-tight font-semibold text-balance text-ink">{str(value.title)}</h3>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-y border-line py-3 text-sm">
        <dt className="text-ink-muted">For</dt>
        <dd className="text-ink capitalize">{params?.audience ?? 'Leadership'}</dd>
        <dt className="text-ink-muted">Date</dt>
        <dd className="text-ink">{today(createdAt)}</dd>
      </dl>

      <div className="mt-6 rounded-xl bg-[#0b1626] p-5 text-white dark:bg-brand-soft dark:text-ink dark:ring-1 dark:ring-brand/30">
        <p className="mb-1 font-mono text-[11px] tracking-[0.2em] text-[#9fe7e0] uppercase dark:text-brand-ink">Bottom line up front</p>
        <p className="text-base leading-relaxed font-medium sm:text-lg">{str(value.bottom_line)}</p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <Heading first>Key points</Heading>
          <ul className="space-y-2">
            {arr(value.key_points).map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Heading first>Implications</Heading>
          <ul className="space-y-2">
            {arr(value.implications).map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-warn" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Heading>Decisions and actions</Heading>
      <ol className="space-y-2">
        {arr(value.recommended_actions).map((a, i) => (
          <li key={i} className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink">
            <ArrowRight className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
            <span>
              <span className="sr-only">Action {i + 1}: </span>
              {a}
            </span>
          </li>
        ))}
      </ol>
    </Sheet>
  )
}
