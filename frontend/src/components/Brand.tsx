// Shield split by a prism: one source, many outputs.
export function BrandMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2.5 4.5 6.8v8.4c0 7.2 4.9 12.4 11.5 14.3 6.6-1.9 11.5-7.1 11.5-14.3V6.8Z" className="fill-brand" />
      <path d="M9.5 16.5h6.5" className="stroke-on-brand" strokeWidth="2" strokeLinecap="round" />
      <path d="m16 16.5 6.5-4.5M16 16.5h6.5M16 16.5l6.5 4.5" className="stroke-accent" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="16.5" r="2.2" className="fill-on-brand" />
    </svg>
  )
}
