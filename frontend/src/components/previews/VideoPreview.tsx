import { motion } from 'motion/react'
import { Captions, ChevronDown, Clapperboard, Music, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { arr, str, type Scene, type VideoPackage } from '../../lib/content'
import { cx } from '../../lib/cx'

// Brand-derived hues (teal, navy, saffron, slate) so the timeline reads as one family.
const SCENE_TINTS = ['#0f6e70', '#1d4f91', '#9a5b10', '#2f5d78', '#0b7a6e', '#43507a', '#7a4a12', '#265e6b']
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function VideoPreview({ value }: { value: VideoPackage }) {
  const scenes = arr(value.storyboard).map((s) => ({ ...s, duration_seconds: Math.max(1, Number(s.duration_seconds) || 1) }))
  const total = scenes.reduce((a, s) => a + s.duration_seconds, 0) || 1
  const starts: number[] = []
  for (let i = 0; i < scenes.length; i++) starts.push(i === 0 ? 0 : starts[i - 1] + scenes[i - 1].duration_seconds)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const raf = useRef<number | null>(null)

  const idx = Math.max(0, starts.findLastIndex((s) => s <= t))
  const scene: Scene | undefined = scenes[idx]

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setT((v) => {
        const nv = v + dt
        if (nv >= total) {
          setPlaying(false)
          return total
        }
        return nv
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [playing, total])

  const toggle = () => {
    if (t >= total) setT(0)
    setPlaying((p) => !p)
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-xl font-semibold text-ink">{str(value.title)}</h3>
        <p className="mt-1 text-sm text-ink-muted">{str(value.logline)}</p>
      </div>

      {scene && (
        <div className="overflow-hidden rounded-xl bg-[#0b1626] shadow-pop dark:ring-1 dark:ring-white/10">
          <div className="@container relative aspect-[4/3] sm:aspect-video">
            <motion.div
              key={idx}
              initial={{ opacity: 0.4, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
              style={{ background: `radial-gradient(120% 100% at 30% 20%, ${SCENE_TINTS[idx % SCENE_TINTS.length]} 0%, #0b1626 70%)` }}
            />
            <div className="absolute inset-0 flex flex-col p-[4cqw] text-white">
              <div className="flex items-center gap-1.5 font-mono text-[max(10px,1.7cqw)] leading-none text-white/80">
                <Clapperboard className="size-[max(12px,2.4cqw)]" aria-hidden />
                SCENE {scene.number ?? idx + 1} · {scene.duration_seconds}s
              </div>
              <p className="mt-[2cqw] max-w-[80%] text-[max(11px,2.2cqw)] leading-snug text-white/80 italic">{str(scene.visual)}</p>
              <div className="mt-auto">
                {str(scene.on_screen_text) && (
                  <div className="mb-[2cqw] inline-block border-l-4 border-[#f2a93b] bg-black/55 px-[2cqw] py-[1cqw] font-display text-[max(13px,3.2cqw)] leading-tight font-semibold">
                    {scene.on_screen_text}
                  </div>
                )}
                <p className="mx-auto max-w-[92%] rounded bg-black/70 px-[1.5cqw] py-[0.6cqw] text-center text-[max(11px,2cqw)] leading-snug">
                  {str(scene.narration)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? 'Pause storyboard' : t >= total ? 'Replay storyboard' : 'Play storyboard'}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#0b1626] hover:bg-[#9fe7e0]"
            >
              {playing ? <Pause className="size-4" /> : t >= total ? <RotateCcw className="size-4" /> : <Play className="ml-0.5 size-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={total}
              step={1}
              value={t}
              onChange={(e) => setT(Number(e.target.value))}
              aria-label="Storyboard position"
              aria-valuetext={`${clock(t)} of ${clock(total)}, scene ${idx + 1}`}
              className="h-6 min-w-0 flex-1 cursor-pointer accent-[#2ec4b6]"
            />
            <span className="shrink-0 font-mono text-xs text-white/80">
              {clock(t)} / {clock(total)}
            </span>
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">Timeline</h4>
        <ul className="flex h-14 gap-1 p-0.5" aria-label="Scenes">
          {scenes.map((s, i) => (
            <li key={i} className="flex min-w-8 basis-0" style={{ flexGrow: s.duration_seconds }}>
              <button
                type="button"
                onClick={() => setT(starts[i])}
                aria-label={`Scene ${i + 1}, ${s.duration_seconds} seconds: ${str(s.on_screen_text) || str(s.visual)}`}
                aria-current={i === idx ? 'true' : undefined}
                style={{ background: SCENE_TINTS[i % SCENE_TINTS.length] }}
                className={cx(
                  'relative w-full overflow-hidden rounded-md px-2 py-1.5 text-left text-white transition-[filter,box-shadow]',
                  i === idx ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'brightness-[0.82] hover:brightness-100',
                )}
              >
                <span className="block font-mono text-[11px] font-semibold">S{i + 1}</span>
                <span className="block truncate text-[11px]">{s.duration_seconds}s</span>
                {i === idx && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-0 h-1 bg-white"
                    style={{ width: `${Math.min(100, ((t - starts[i]) / s.duration_seconds) * 100)}%` }}
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex justify-between font-mono text-[11px] text-ink-muted" aria-hidden>
          <span>0:00</span>
          <span>{clock(total / 2)}</span>
          <span>{clock(total)}</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel icon={<Sparkles className="size-3.5" />} title="Visual direction">
          <ul className="list-disc space-y-1 pl-4 text-sm text-ink">
            {arr(value.visual_recommendations).map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </Panel>
        <Panel icon={<Music className="size-3.5" />} title="Music and tone">
          <p className="text-sm text-ink">{str(value.music_and_tone)}</p>
        </Panel>
      </div>

      <Disclosure icon={<Captions className="size-4" />} title={`Subtitles (${arr(value.subtitles).length} cues)`}>
        <ol className="divide-y divide-line font-mono text-xs">
          {arr(value.subtitles).map((s, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr] gap-3 py-1.5">
              <span className="text-ink-muted">
                {str(s.start).slice(3, 8)}–{str(s.end).slice(3, 8)}
              </span>
              <span className="font-sans text-sm text-ink">{s.text}</span>
            </li>
          ))}
        </ol>
      </Disclosure>
      <Disclosure icon={<Clapperboard className="size-4" />} title="Full narration script">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">{str(value.script)}</p>
      </Disclosure>
    </div>
  )
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
        {icon} {title}
      </h4>
      {children}
    </div>
  )
}

function Disclosure({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-line">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
        <span className="text-ink-muted">{icon}</span>
        {title}
        <ChevronDown className="ml-auto size-4 text-ink-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-line px-4 py-3">{children}</div>
    </details>
  )
}
