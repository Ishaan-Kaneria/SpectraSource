import { BadgeCheck, Bookmark, ChartNoAxesColumn, Globe, Heart, MessageCircle, Repeat2, Send, Share, ThumbsUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { arr, str, type LinkedInPost, type TwitterThread } from '../../lib/content'
import { BrandMark } from '../Brand'
import { cx } from '../../lib/cx'

const tag = (h: string) => (h.startsWith('#') ? h : `#${h.replace(/\s+/g, '')}`)

// Highlights #tags, @handles and links the way the platforms do.
function Rich({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+|@[\w]+|https?:\/\/\S+)/u)
  return (
    <span className={className}>
      {parts.map((p, i) =>
        /^(#|@|https?:)/.test(p) ? (
          <span key={i} className="text-brand-ink">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </span>
  )
}

function Avatar({ size = 'size-10' }: { size?: string }) {
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-full bg-[#0b1626] ring-1 ring-line', size)}>
      <BrandMark className="size-[60%]" />
    </span>
  )
}

export function TwitterPreview({ value }: { value: TwitterThread }) {
  const tweets = arr(value.tweets)
  const tags = arr(value.hashtags)
  return (
    <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-sm">
        <span className="font-semibold text-ink">Thread preview</span>
        <span className="text-xs text-ink-muted">{tweets.length} posts</span>
      </div>
      <ol>
        {tweets.map((t, i) => {
          const text = str(t.text)
          const last = i === tweets.length - 1
          const withTags = last && tags.length && !tags.some((h) => text.includes(tag(h))) ? `${text}\n\n${tags.map(tag).join(' ')}` : text
          return (
            <li key={i} className="relative flex gap-3 px-4 pt-3 pb-1">
              {!last && <span aria-hidden className="absolute top-14 bottom-0 left-[2.2rem] w-0.5 bg-line" />}
              <Avatar />
              <div className="min-w-0 flex-1 pb-2">
                <div className="flex flex-wrap items-center gap-x-1 text-sm">
                  <span className="font-bold text-ink">SpectraSource Desk</span>
                  <BadgeCheck className="size-4 text-brand-ink" aria-label="Verified account" />
                  <span className="text-ink-muted">@spectrasource · now</span>
                </div>
                <p className="mt-0.5 text-[15px] leading-normal whitespace-pre-wrap text-ink">
                  <Rich text={withTags} />
                </p>
                <div className="mt-2 flex items-center justify-between text-ink-muted" aria-hidden>
                  <MessageCircle className="size-4" />
                  <Repeat2 className="size-4" />
                  <Heart className="size-4" />
                  <ChartNoAxesColumn className="size-4" />
                  <span className="flex items-center gap-3">
                    <Bookmark className="size-4" />
                    <Share className="size-4" />
                  </span>
                </div>
                <CharCount n={[...withTags].length} />
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function CharCount({ n, max = 280 }: { n: number; max?: number }) {
  const over = n > max
  const r = 7
  const c = 2 * Math.PI * r
  return (
    <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-ink-muted">
      <svg viewBox="0 0 18 18" className="size-4 -rotate-90" aria-hidden>
        <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2" className="stroke-line" />
        <circle
          cx="9"
          cy="9"
          r={r}
          fill="none"
          strokeWidth="2"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(n / max, 1))}
          className={over ? 'stroke-bad' : n > max * 0.9 ? 'stroke-warn' : 'stroke-brand'}
        />
      </svg>
      <span className={over ? 'font-medium text-bad-ink' : undefined}>
        {n}/{max}
      </span>
    </div>
  )
}

export function LinkedInPreview({ value }: { value: LinkedInPost }) {
  const [more, setMore] = useState(false)
  const body = str(value.body)
  const long = body.length > 260
  const tags = arr(value.hashtags).map(tag)
  const total = [str(value.hook), body, str(value.call_to_action), tags.join(' ')].join('\n\n').length

  return (
    <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex gap-3 p-4 pb-2">
        <Avatar size="size-12" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-ink">SpectraSource Desk</p>
          <p className="truncate text-xs text-ink-muted">Cyber awareness and public advisories</p>
          <p className="flex items-center gap-1 text-xs text-ink-muted">
            now · <Globe className="size-3" aria-label="Public" />
          </p>
        </div>
      </div>
      <div className="px-4 text-sm leading-relaxed text-ink">
        <p className="font-semibold">{str(value.hook)}</p>
        <div className="relative mt-2">
          <p className={cx('whitespace-pre-wrap', !more && long && 'line-clamp-3')}>
            <Rich text={body} />
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              className="mt-1 text-sm font-medium text-ink-muted hover:text-brand-ink hover:underline"
            >
              {more ? 'Show less' : '…see more'}
            </button>
          )}
        </div>
        {(more || !long) && (
          <>
            {str(value.call_to_action) && <p className="mt-3 font-medium">{value.call_to_action}</p>}
            {tags.length > 0 && <p className="mt-3 font-medium text-brand-ink">{tags.join(' ')}</p>}
          </>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-b border-line px-4 pb-2 text-xs text-ink-muted">
        <span className="flex items-center gap-1">
          <span className="grid size-4 place-items-center rounded-full bg-[#0a66c2] text-white">
            <ThumbsUp className="size-2.5" aria-hidden />
          </span>
          Be the first to react
        </span>
        <span>{total} / 3000 characters</span>
      </div>
      <div className="grid grid-cols-4 px-2 py-1 text-xs font-semibold text-ink-muted" aria-hidden>
        <Action icon={<ThumbsUp className="size-4" />} label="Like" />
        <Action icon={<MessageCircle className="size-4" />} label="Comment" />
        <Action icon={<Repeat2 className="size-4" />} label="Repost" />
        <Action icon={<Send className="size-4" />} label="Send" />
      </div>
    </div>
  )
}

function Action({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center justify-center gap-1.5 rounded-md py-2.5">
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
