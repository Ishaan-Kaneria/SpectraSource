import { Check } from 'lucide-react'
import { FORMAT_STYLE } from '../lib/formats'
import { OUTPUT_TYPES, type OutputType } from '../types'
import { SectionTitle } from './ui'
import { cx } from '../lib/cx'

export function FormatPicker({ selected, onChange }: { selected: OutputType[]; onChange: (s: OutputType[]) => void }) {
  const all = selected.length === OUTPUT_TYPES.length
  const toggle = (t: OutputType) => onChange(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t])

  return (
    <fieldset>
      <legend className="sr-only">Output formats</legend>
      <SectionTitle
        step={2}
        title="Formats"
        hint={
          <button
            type="button"
            onClick={() => onChange(all ? [] : OUTPUT_TYPES.map((o) => o.id))}
            className="inline-flex min-h-7 items-center rounded-md px-2 font-medium text-brand-ink hover:bg-brand-soft"
          >
            {all ? 'Clear all' : 'Select all 7'}
          </button>
        }
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {OUTPUT_TYPES.map((o) => {
          const on = selected.includes(o.id)
          const S = FORMAT_STYLE[o.id]
          return (
            <label
              key={o.id}
              className={cx(
                'relative flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 pr-3 transition-[border-color,background-color,box-shadow,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 lg:flex-col lg:items-start lg:gap-2 lg:p-3',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                on ? 'border-brand bg-brand-soft shadow-sm' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
              )}
            >
              <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(o.id)} />
              <span className={cx('grid size-9 shrink-0 place-items-center rounded-lg', S.chip)}>
                <S.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-tight font-semibold text-ink lg:pr-5">{o.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-muted lg:sr-only">{o.blurb}</span>
              </span>
              <span
                aria-hidden
                className={cx(
                  'grid size-5 shrink-0 place-items-center rounded-full border transition-colors lg:absolute lg:top-2.5 lg:right-2.5',
                  on ? 'border-brand bg-brand text-on-brand' : 'border-line-strong bg-surface',
                )}
              >
                {on && <Check className="size-3.5" strokeWidth={3} />}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
