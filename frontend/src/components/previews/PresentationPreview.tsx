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

  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
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
        className="group relative overflow-hidden rounded-xl bg-[#0b1626] shadow-pop ring-1 ring-black/10"
      >
        <div className="@container relative aspect-video">
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
              {page.kind === 'title' ? <TitleSlide value={value} /> : <ContentSlide slide={page.slide} n={page.n} total={slides.length} deck={str(value.title)} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <NavButton side="left" disabled={i === 0} onClick={() => go(i - 1)} />
        <NavButton side="right" disabled={i === pages.length - 1} onClick={() => go(i + 1)} />
        <div className="absolute right-3 bottom-3 rounded-md bg-black/55 px-2 py-0.5 font-mono text-[11px] text-white" aria-hidden>
          {i + 1} / {pages.length}
        </div>
      </div>

      <div ref={strip} className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Slide thumbnails">
        {pages.map((p, n) => (
          <button
            key={n}
            data-i={n}
            type="button"
            role="tab"
            aria-selected={n === i}
            aria-label={`Slide ${n + 1}: ${p.kind === 'title' ? str(value.title) : str(p.slide.title)}`}
            onClick={() => go(n)}
            className={cx(
              '@container relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-[#0b1626] ring-2 transition-[box-shadow,opacity]',
              n === i ? 'ring-brand' : 'opacity-70 ring-transparent hover:opacity-100',
            )}
          >
            <div className="pointer-events-none absolute inset-0 origin-top-left">
              {p.kind === 'title' ? <TitleSlide value={value} mini /> : <ContentSlide slide={p.slide} n={p.n} total={slides.length} deck="" mini />}
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
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous slide' : 'Next slide'}
      className={cx(
        'absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0b1626] shadow-md transition-opacity hover:bg-white disabled:opacity-0 sm:size-10',
        side === 'left' ? 'left-2 sm:left-3' : 'right-2 sm:right-3',
      )}
    >
      <Icon className="size-5" />
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
        {!mini && <span className="text-[1.8cqw] font-medium tracking-[0.2em] text-[#9fe7e0] uppercase">Briefing</span>}
      </div>
      <div className="relative">
        <div className="mb-[2.5cqw] h-[0.6cqw] w-[10cqw] rounded-full bg-[#f2a93b]" />
        <h3 className="font-display text-[5cqw] leading-[1.08] font-semibold text-balance">{str(value.title)}</h3>
        <p className="mt-[2cqw] max-w-[80%] text-[2.2cqw] leading-snug text-[#c9d6e3]">{str(value.subtitle)}</p>
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
        <div className="mb-[1cqw] font-mono text-[1.5cqw] tracking-widest text-[#0f6e70] uppercase">
          {String(n).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
        <h3 className="font-display text-[3.6cqw] leading-tight font-semibold text-balance">{str(slide.title)}</h3>
        <ul className="mt-[3cqw] space-y-[1.6cqw]">
          {bullets.slice(0, 6).map((b, k) => (
            <li key={k} className="flex gap-[1.6cqw] text-[2.15cqw] leading-snug text-[#24364a]">
              <span className="mt-[0.9cqw] size-[1cqw] shrink-0 rotate-45 bg-[#0f8b8d]" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {!mini && deck && (
          <div className="mt-auto flex items-center justify-between border-t border-[#d5dde6] pt-[1.5cqw] text-[1.4cqw] text-[#4d5f73]">
            <span className="truncate">{deck}</span>
            <span>SpectraSource</span>
          </div>
        )}
      </div>
    </div>
  )
}
