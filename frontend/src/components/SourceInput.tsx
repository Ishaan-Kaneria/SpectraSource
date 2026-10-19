import { AnimatePresence, motion } from 'motion/react'
import { CloudUpload, File as FileIcon, FileAudio, FileImage, FileText, FileVideo, Sparkles, X } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { SAMPLE_SOURCE } from '../lib/sample'
import { formatBytes } from '../lib/time'
import { SectionTitle } from './ui'
import { cx } from '../lib/cx'

// Mirrors the backend's max_source_chars.
const MAX_CHARS = 60_000

export const ACCEPT = '.pdf,.docx,.txt,.md,.html,.png,.jpg,.jpeg,.webp,.mp4,.mov,.webm,.mp3,.wav,.m4a'
const EXT = ACCEPT.split(',')

function kindOf(f: File): 'image' | 'video' | 'audio' | 'text' | 'doc' {
  if (f.type.startsWith('image/')) return 'image'
  if (f.type.startsWith('video/')) return 'video'
  if (f.type.startsWith('audio/')) return 'audio'
  if (/\.(txt|md|html)$/i.test(f.name) || f.type.startsWith('text/')) return 'text'
  return 'doc'
}

const KIND_ICON = { image: FileImage, video: FileVideo, audio: FileAudio, text: FileText, doc: FileIcon }

export function SourceInput({
  text,
  onText,
  file,
  onFile,
}: {
  text: string
  onText: (t: string) => void
  file: File | null
  onFile: (f: File | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [reject, setReject] = useState<string | null>(null)
  // Where keyboard focus should land after the drop zone and file preview swap places.
  const focusNext = useRef<'remove' | 'choose' | null>(null)
  const focusIf = (which: 'remove' | 'choose') => (el: HTMLElement | null) => {
    if (el && focusNext.current === which) {
      focusNext.current = null
      el.focus()
    }
  }
  const deferred = useDeferredValue(text)
  const words = useMemo(() => (deferred.trim() ? deferred.trim().split(/\s+/).length : 0), [deferred])

  const take = (f: File | undefined) => {
    if (!f) return
    const ok = EXT.some((e) => f.name.toLowerCase().endsWith(e))
    if (!ok) {
      setReject(`${f.name} isn't a supported type.`)
      return
    }
    setReject(null)
    focusNext.current = 'remove'
    onFile(f)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    take(e.dataTransfer.files?.[0])
  }

  return (
    <section>
      <SectionTitle
        step={1}
        title="Source"
        hint={
          <button
            type="button"
            onClick={() => onText(SAMPLE_SOURCE)}
            className="inline-flex min-h-7 items-center gap-1 rounded-md px-2 font-medium text-brand-ink hover:bg-brand-soft"
          >
            <Sparkles className="size-3.5" /> Try a sample advisory
          </button>
        }
      />

      <AnimatePresence mode="wait" initial={false}>
        {file ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <FilePreview
              file={file}
              removeRef={focusIf('remove')}
              onRemove={() => {
                focusNext.current = 'choose'
                onFile(null)
              }}
            />
          </motion.div>
        ) : (
          <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              className={cx(
                'relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors',
                drag ? 'border-brand bg-brand-soft' : 'border-line-strong bg-surface-2/60 hover:border-brand/60',
              )}
            >
              <motion.span
                animate={drag ? { y: -3, scale: 1.08 } : { y: 0, scale: 1 }}
                className="mb-1 grid size-10 place-items-center rounded-full bg-brand-soft text-brand-ink"
              >
                <CloudUpload className="size-5" aria-hidden />
              </motion.span>
              <p className="text-sm text-ink">
                <button
                  ref={focusIf('choose')}
                  type="button"
                  onClick={() => input.current?.click()}
                  className="font-semibold text-brand-ink underline-offset-2 hover:underline after:absolute after:inset-0 after:content-['']"
                >
                  Choose a file
                </button>{' '}
                or drag it here
              </p>
              <p className="text-xs text-balance text-ink-muted">PDF, DOCX, text, image, audio or video · max 25 MB</p>
              <input
                ref={input}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  take(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {reject && (
        <p role="alert" className="mt-2 text-xs text-bad-ink">
          {reject} Use one of: {EXT.join(' ')}
        </p>
      )}

      <div className="mt-4 mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor="source-text" className="block text-xs font-medium text-ink-muted">
          {file ? 'Extra context for the AI (optional)' : 'Or paste text'}
        </label>
        {words > 0 && <span className="font-mono text-[11px] text-ink-subtle">{words.toLocaleString('en-IN')} words</span>}
      </div>
      <textarea
        id="source-text"
        value={text}
        onChange={(e) => onText(e.target.value)}
        rows={file ? 3 : 5}
        placeholder={file ? 'e.g. Focus on what citizens should do' : 'Paste an advisory, report, article or brief…'}
        className="block w-full resize-y rounded-xl border border-line-strong bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-subtle focus:border-brand"
        aria-describedby={text.length > MAX_CHARS ? 'source-too-long' : undefined}
      />
      {text.length > MAX_CHARS && (
        <p id="source-too-long" className="mt-1.5 text-xs text-warn-ink">
          Only the first {MAX_CHARS.toLocaleString('en-IN')} characters are used. Trim the text or upload the document instead.
        </p>
      )}
    </section>
  )
}

function FilePreview({ file, onRemove, removeRef }: { file: File; onRemove: () => void; removeRef: (el: HTMLElement | null) => void }) {
  const kind = kindOf(file)
  const url = useMemo(() => (kind === 'image' || kind === 'video' || kind === 'audio' ? URL.createObjectURL(file) : null), [file, kind])
  const [snippet, setSnippet] = useState<string | null>(null)
  const Icon = KIND_ICON[kind]

  useEffect(() => {
    if (url) return () => URL.revokeObjectURL(url)
  }, [url])

  useEffect(() => {
    if (kind === 'text') {
      file
        .slice(0, 1200)
        .text()
        .then(setSnippet)
        .catch(() => setSnippet(null))
    }
  }, [file, kind])

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
      {kind === 'image' && url && <img src={url} alt={`Preview of ${file.name}`} className="max-h-48 w-full bg-surface-3 object-contain" />}
      {kind === 'video' && url && <video src={url} controls className="max-h-48 w-full bg-black" aria-label={`Preview of ${file.name}`} />}
      {kind === 'audio' && url && <audio src={url} controls className="w-full px-3 pt-3" aria-label={`Preview of ${file.name}`} />}
      {kind === 'text' && snippet && (
        <pre className="max-h-32 overflow-hidden px-3.5 pt-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-ink-muted [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
          {snippet}
        </pre>
      )}
      <div className="flex items-center gap-3 p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface text-brand-ink shadow-sm">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{file.name}</p>
          <p className="text-xs text-ink-muted">
            {formatBytes(file.size)} ·{' '}
            {kind === 'image' ? 'read by a vision model' : kind === 'video' || kind === 'audio' ? 'will be transcribed' : 'text will be extracted'}
          </p>
        </div>
        <button
          ref={removeRef}
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-bad-ink"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
