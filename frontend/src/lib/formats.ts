import {
  BriefcaseBusiness,
  ChartPie,
  Clapperboard,
  FileText,
  MessagesSquare,
  Presentation,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import type { OutputType } from '../types'

// Full class strings so Tailwind's scanner picks them up.
export const FORMAT_STYLE: Record<OutputType, { icon: LucideIcon; text: string; chip: string; bar: string; ring: string }> = {
  presentation: {
    icon: Presentation,
    text: 'text-fmt-presentation',
    chip: 'bg-fmt-presentation-soft text-fmt-presentation-ink',
    bar: 'bg-fmt-presentation',
    ring: 'ring-fmt-presentation/40',
  },
  advisory: {
    icon: ShieldAlert,
    text: 'text-fmt-advisory',
    chip: 'bg-fmt-advisory-soft text-fmt-advisory-ink',
    bar: 'bg-fmt-advisory',
    ring: 'ring-fmt-advisory/40',
  },
  executive_summary: {
    icon: FileText,
    text: 'text-fmt-executive_summary',
    chip: 'bg-fmt-executive_summary-soft text-fmt-executive_summary-ink',
    bar: 'bg-fmt-executive_summary',
    ring: 'ring-fmt-executive_summary/40',
  },
  infographic: {
    icon: ChartPie,
    text: 'text-fmt-infographic',
    chip: 'bg-fmt-infographic-soft text-fmt-infographic-ink',
    bar: 'bg-fmt-infographic',
    ring: 'ring-fmt-infographic/40',
  },
  linkedin: {
    icon: BriefcaseBusiness,
    text: 'text-fmt-linkedin',
    chip: 'bg-fmt-linkedin-soft text-fmt-linkedin-ink',
    bar: 'bg-fmt-linkedin',
    ring: 'ring-fmt-linkedin/40',
  },
  twitter: {
    icon: MessagesSquare,
    text: 'text-fmt-twitter',
    chip: 'bg-fmt-twitter-soft text-fmt-twitter-ink',
    bar: 'bg-fmt-twitter',
    ring: 'ring-fmt-twitter/40',
  },
  video: {
    icon: Clapperboard,
    text: 'text-fmt-video',
    chip: 'bg-fmt-video-soft text-fmt-video-ink',
    bar: 'bg-fmt-video',
    ring: 'ring-fmt-video/40',
  },
}
