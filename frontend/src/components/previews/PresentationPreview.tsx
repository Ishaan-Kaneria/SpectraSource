import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, ImageIcon, NotebookPen } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { arr, str, type Presentation, type Slide } from '../../lib/content'
import { BrandMark } from '../Brand'
import { cx } from '../../lib/cx'

type Page = { kind: 'title' } | { kind: 'slide'; slide: Slide; n: number }

export function PresentationPreview({ value }: { value: Presentation }) {
  const slides = arr(value.slides)
  const pages: Page[] = [{ kind: 'title' }, ...slides.map((slide, i) => ({ kind: 'slide' as const, slide, n: i + 1 }))]
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const strip = useRef<HTMLDivElement>(null)
  const page = pages[Math.min(i, pages.length - 1)]

  const go = (n: number) => {
    const next = Math.max(0, Math.min(pages.length - 1, n))
    setDir(next >= i ? 1 : -1)
    setI(next)
  }

  // Keep the current thumbnail visible by scrolling the strip only, never the page.
  useEffect(() => {
    const box = strip.current
    const el = box?.querySelector<HTMLElement>(`[data-i="${i}"]`)
    if (!box || !el) return
    if (el.offsetLeft < box.scrollLeft) box.scrollLeft = el.offsetLeft - 4
    else if (el.offsetLeft + el.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollLeft = el.offsetLeft + el.offsetWidth - box.clientWidth + 4
  }, [i])

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(i + 1)
    if (e.key === 'ArrowLeft') go(i - 1)
  }

  return (
    <div className="space-y-4">
      <div
        tabIndex={0}
        onKeyDown={onKey}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Slides, ${i + 1} of ${pages.length}. Use arrow keys to move.`}
        className="group relative overflow-hidden rounded-xl bg-[#0b1626] shadow-pop ring-1 ring-black/10 dark:ring-white/10"
      >
        <div className="@container relative aspect-[4/3] sm:aspect-video">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={i}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {page.kind === 'title' ? <TitleSlide value={value} /> : <ContentSlide slide={page.slide} n={page.n + 1} total={pages.length} deck={str(value.title)} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <NavButton side="left" disabled={i === 0} onClick={() => go(i - 1)} />
        <p className="text-sm text-ink-muted" aria-live="polite">
          Slide <span className="font-semibold text-ink">{i + 1}</span> of {pages.length}
        </p>
        <NavButton side="right" disabled={i === pages.length - 1} onClick={() => go(i + 1)} />
      </div>

      <div ref={strip} className="relative flex gap-2 overflow-x-auto p-0.5 pb-1" aria-label="Slide thumbnails" role="group">
        {pages.map((p, n) => (
          <button
            key={n}
            data-i={n}
            type="button"
            tabIndex={-1}
            aria-current={n === i ? 'true' : undefined}
            aria-label={`Slide ${n + 1}: ${p.kind === 'title' ? str(value.title) : str(p.slide.title)}`}
            onClick={() => go(n)}
            className={cx(
              '@container relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-[#0b1626] text-left ring-2 transition-[box-shadow]',
              n === i ? 'ring-brand' : 'ring-line hover:ring-line-strong',
            )}
          >
            <div className="pointer-events-none absolute inset-0 origin-top-left">
              {p.kind === 'title' ? <TitleSlide value={value} mini /> : <ContentSlide slide={p.slide} n={p.n + 1} total={pages.length} deck="" mini />}
            </div>
          </button>
        ))}
      </div>

      {page.kind === 'slide' && (str(page.slide.speaker_notes) || str(page.slide.visual_suggestion)) && (
        <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
          {str(page.slide.speaker_notes) && (
            <div className="rounded-xl border border-line bg-surface-2 p-4">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                <NotebookPen className="size-3.5" aria-hidden /> Speaker notes
              </h4>
              <p className="text-sm leading-relaxed text-ink">{page.slide.speaker_notes}</p>
            </div>
          )}
          {str(page.slide.visual_suggestion) && (
            <div className="rounded-xl border border-dashed border-line-strong p-4">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                <ImageIcon className="size-3.5" aria-hidden /> Suggested visual
              </h4>
              <p className="text-sm leading-relaxed text-ink-muted">{page.slide.visual_suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NavButton({ side, disabled, onClick }: { side: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={() => !disabled && onClick()}
      aria-disabled={disabled}
      aria-label={side === 'left' ? 'Previous slide' : 'Next slide'}
      className="inline-flex h-9 items-center gap-1 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
    >
      {side === 'left' && <Icon className="size-4" aria-hidden />}
      <span className="hidden sm:inline">{side === 'left' ? 'Previous' : 'Next'}</span>
      {side === 'right' && <Icon className="size-4" aria-hidden />}
    </button>
  )
}

// Slides are always dark "projector" styling, independent of the app theme, sized in container units.
function TitleSlide({ value, mini }: { value: Presentation; mini?: boolean }) {
  return (
    <div className="relative flex h-full flex-col justify-end overflow-hidden bg-[radial-gradient(120%_90%_at_100%_0%,#0f4c5c_0%,#0b1626_55%)] p-[7cqw] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(#ffffff0a_1px,transparent_1px),linear-gradient(90deg,#ffffff0a_1px,transparent_1px)] bg-[size:6cqw_6cqw]" />
      <div className="absolute top-[7cqw] left-[7cqw] flex items-center gap-[1.4cqw]">
        <BrandMark className="size-[4.5cqw]" />
        {!mini && <span className="text-[max(10px,1.8cqw)] leading-none font-medium tracking-[0.2em] text-[#9fe7e0] uppercase">Briefing</span>}
      </div>
      <div className="relative">
        <div className="mb-[2.5cqw] h-[0.6cqw] w-[10cqw] rounded-full bg-[#f2a93b]" />
        <h3 className={cx('font-display leading-[1.08] font-semibold text-balance', mini ? 'text-[5cqw]' : 'text-[max(16px,5cqw)]')}>{str(value.title)}</h3>
        <p className={cx('mt-[2cqw] max-w-[85%] leading-snug text-[#c9d6e3]', mini ? 'text-[2.2cqw]' : 'text-[max(11px,2.2cqw)]')}>{str(value.subtitle)}</p>
      </div>
    </div>
  )
}

function ContentSlide({ slide, n, total, deck, mini }: { slide: Slide; n: number; total: number; deck: string; mini?: boolean }) {
  const bullets = arr(slide.bullets)
  return (
    <div className="flex h-full bg-[#f7f9fb] text-[#0b1626]">
      <div className="w-[1.2cqw] bg-[linear-gradient(#0f8b8d,#f2a93b)]" />
      <div className="flex min-w-0 flex-1 flex-col p-[5.5cqw]">
        <div className={cx('mb-[1cqw] font-mono leading-none tracking-widest text-[#0f6e70] uppercase', mini ? 'text-[1.5cqw]' : 'text-[max(9px,1.5cqw)]')}>
          {String(n).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
        <h3 className={cx('font-display leading-tight font-semibold text-balance', mini ? 'text-[3.6cqw]' : 'text-[max(14px,3.6cqw)]')}>{str(slide.title)}</h3>
        <ul className="mt-[3cqw] space-y-[1.6cqw]">
          {bullets.slice(0, 6).map((b, k) => (
            <li key={k} className={cx('flex gap-[1.6cqw] leading-snug text-[#24364a]', mini ? 'text-[2.15cqw]' : 'text-[max(11px,2.15cqw)]')}>
              <span className="mt-[0.9cqw] size-[1cqw] shrink-0 rotate-45 bg-[#0f8b8d]" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {!mini && deck && (
          <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#d5dde6] pt-[1.5cqw] text-[max(9px,1.4cqw)] leading-none text-[#4d5f73]">
            <span className="truncate">{deck}</span>
            <span>SpectraSource</span>
          </div>
        )}
      </div>
    </div>
  )
}
