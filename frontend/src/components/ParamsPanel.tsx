import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { GenerationParams } from '../types'
import { SectionTitle } from './ui'
import { cx } from '../lib/cx'

const FIELDS: { key: Exclude<keyof GenerationParams, 'detail_level'>; label: string; options: string[] }[] = [
  { key: 'audience', label: 'Audience', options: ['general public', 'senior leadership', 'IT / SOC teams', 'policy makers', 'students'] },
  { key: 'tone', label: 'Tone', options: ['professional', 'urgent', 'reassuring', 'conversational', 'formal'] },
  { key: 'language', label: 'Language', options: ['English', 'Hindi', 'Gujarati', 'Tamil', 'Bengali', 'Marathi'] },
  { key: 'objective', label: 'Objective', options: ['inform', 'warn', 'persuade', 'educate', 'call to action'] },
  { key: 'style', label: 'Style', options: ['clear and factual', 'storytelling', 'data-driven', 'bullet-heavy'] },
]

const DETAIL: GenerationParams['detail_level'][] = ['brief', 'medium', 'detailed']

export function ParamsPanel({ params, onChange }: { params: GenerationParams; onChange: (p: GenerationParams) => void }) {
  const [open, setOpen] = useState(false)
  const set = <K extends keyof GenerationParams>(k: K, v: GenerationParams[K]) => onChange({ ...params, [k]: v })

  return (
    <section>
      <SectionTitle step={3} title="Audience and tone" />
      <fieldset className="mb-3">
        <legend className="sr-only">Level of detail</legend>
        <div className="grid grid-cols-3 rounded-xl border border-line bg-surface-2 p-1">
          {DETAIL.map((d) => (
            <label
              key={d}
              className={cx(
                'grid h-8 cursor-pointer place-items-center rounded-lg text-xs font-medium capitalize transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-focus',
                params.detail_level === d ? 'bg-surface text-ink shadow-sm dark:bg-surface-3' : 'text-ink-muted hover:text-ink',
              )}
            >
              <input
                type="radio"
                name="detail_level"
                value={d}
                checked={params.detail_level === d}
                onChange={() => set('detail_level', d)}
                className="sr-only"
              />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        aria-expanded={open}
        aria-controls="params-fields"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm hover:bg-surface-2"
      >
        <span className="min-w-0 flex-1 truncate text-ink-muted">
          <span className="text-ink">{params.audience}</span> · {params.language}
        </span>
        <span className="shrink-0 text-xs font-medium text-brand-ink">{open ? 'Done' : 'Edit'}</span>
        <ChevronDown className={cx('size-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} aria-hidden />
        <span className="sr-only">audience, tone, language, objective and style</span>
      </button>
      <div id="params-fields" hidden={!open} className="mt-3 grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="text-xs">
            <span className="mb-1 block font-medium text-ink-muted">{f.label}</span>
            <span className="relative block">
              <select
                value={params[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-line-strong bg-surface pr-8 pl-2.5 text-sm text-ink focus:border-brand"
              >
                {f.options.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}
