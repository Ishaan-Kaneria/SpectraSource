import {
  Activity,
  Bug,
  Building2,
  ChartColumn,
  Clock,
  Database,
  Globe,
  KeyRound,
  Landmark,
  LayoutTemplate,
  Lock,
  Megaphone,
  Network,
  Server,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Smartphone,
  TriangleAlert,
  Users,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { arr, str, type Infographic } from '../../lib/content'

const ICONS: [RegExp, LucideIcon][] = [
  [/bug|vuln|exploit|malware/i, Bug],
  [/server|host|appliance|vpn/i, Server],
  [/user|people|citizen|team|group/i, Users],
  [/lock|encrypt|password|secure/i, Lock],
  [/key|credential|auth/i, KeyRound],
  [/shield.?check|protect|patch|fix/i, ShieldCheck],
  [/shield|alert|threat/i, ShieldAlert],
  [/warn|risk|danger|triangle/i, TriangleAlert],
  [/clock|time|hour|deadline/i, Clock],
  [/chart|stat|graph|data|percent/i, ChartColumn],
  [/database|record/i, Database],
  [/network|lateral|link/i, Network],
  [/globe|world|internet/i, Globe],
  [/bank|finance|landmark|gov/i, Landmark],
  [/building|org|company/i, Building2],
  [/phone|mobile|device/i, Smartphone],
  [/wifi|wireless/i, Wifi],
  [/siren|incident|report/i, Siren],
  [/megaphone|announce|aware/i, Megaphone],
  [/zap|power|energy|fast/i, Zap],
]
const iconFor = (s: string) => ICONS.find(([re]) => re.test(s))?.[1] ?? Activity

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const FALLBACK = ['#0b1626', '#0f8b8d', '#f2a93b', '#e4572e']

function lum(hex: string) {
  const h = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
// Pick black or white text, whichever has more contrast on the given fill.
const onColor = (hex: string) => ((lum(hex) + 0.05) / 0.05 > 1.05 / (lum(hex) + 0.05) ? '#0b1626' : '#ffffff')

export function InfographicPreview({ value }: { value: Infographic }) {
  const pal = arr(value.color_palette).filter((c) => HEX.test(str(c)))
  const palette = pal.length >= 2 ? [...pal, ...FALLBACK].slice(0, 4) : FALLBACK
  // Darkest colour is the poster background; the rest are accents.
  const sorted = [...palette].sort((a, b) => lum(a) - lum(b))
  const [bg, ...accents] = sorted
  const ink = onColor(bg)
  const sections = arr(value.sections)

  return (
    <div className="space-y-3">
      <figure
        className="@container mx-auto max-w-2xl overflow-hidden rounded-xl shadow-pop ring-1 ring-black/10"
        style={{ background: bg, color: ink }}
        aria-label={`Infographic: ${str(value.title)}`}
      >
        <div className="relative p-[6cqw] pb-[4cqw]">
          <div
            aria-hidden
            className="absolute -top-[10cqw] -right-[10cqw] size-[40cqw] rounded-full opacity-25 blur-2xl"
            style={{ background: accents[0] }}
          />
          <p className="relative font-mono text-[2.2cqw] tracking-[0.25em] uppercase opacity-80">Public awareness</p>
          <h3 className="relative mt-[1.5cqw] font-display text-[6.4cqw] leading-[1.05] font-bold text-balance">{str(value.title)}</h3>
          <p className="relative mt-[1.5cqw] text-[3cqw] leading-snug opacity-85">{str(value.subtitle)}</p>
        </div>

        <div className="mx-[6cqw] rounded-[2cqw] p-[3.5cqw]" style={{ background: accents[0], color: onColor(accents[0]) }}>
          <p className="text-[3.4cqw] leading-snug font-semibold">{str(value.key_message)}</p>
        </div>

        <div className="grid grid-cols-2 gap-[3cqw] p-[6cqw]">
          {sections.map((s, i) => {
            const Icon = iconFor(`${str(s.icon_suggestion)} ${str(s.heading)}`)
            const accent = accents[i % accents.length]
            return (
              <div key={i} className="rounded-[2cqw] p-[3.5cqw]" style={{ background: `${ink}12`, border: `1px solid ${ink}22` }}>
                <span
                  className="mb-[2cqw] grid size-[8cqw] place-items-center rounded-[1.6cqw]"
                  style={{ background: accent, color: onColor(accent) }}
                >
                  <Icon className="size-[4.6cqw]" aria-hidden />
                </span>
                <p className="font-display text-[5.2cqw] leading-none font-bold">{str(s.key_stat_or_fact)}</p>
                <p className="mt-[1.5cqw] text-[2.9cqw] font-semibold">{str(s.heading)}</p>
                <p className="mt-[1cqw] text-[2.5cqw] leading-snug opacity-80">{str(s.supporting_text)}</p>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-[3cqw] px-[6cqw] py-[4cqw]" style={{ background: accents[1] ?? accents[0], color: onColor(accents[1] ?? accents[0]) }}>
          <p className="text-[3.2cqw] leading-snug font-bold">{str(value.call_to_action)}</p>
          <span className="shrink-0 font-mono text-[2cqw] opacity-80">SpectraSource</span>
        </div>
      </figure>

      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          Palette
          {palette.map((c) => (
            <span key={c} title={c} className="size-4 rounded-full ring-1 ring-line" style={{ background: c }} />
          ))}
        </span>
        {str(value.layout_recommendation) && (
          <span className="flex min-w-0 items-center gap-1.5">
            <LayoutTemplate className="size-3.5 shrink-0" aria-hidden />
            {value.layout_recommendation}
          </span>
        )}
      </div>
    </div>
  )
}
