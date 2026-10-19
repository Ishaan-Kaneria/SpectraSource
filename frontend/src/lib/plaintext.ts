import type { OutputType } from '../types'
import {
  arr,
  str,
  type Advisory,
  type ExecutiveSummary,
  type Infographic,
  type LinkedInPost,
  type Presentation,
  type TwitterThread,
  type VideoPackage,
} from './content'

const list = (xs: unknown[], mark = '-') => arr(xs).map((x) => `${mark} ${str(x)}`).join('\n')
const tag = (h: string) => (h.startsWith('#') ? h : `#${h.replace(/\s+/g, '')}`)

/** Ready-to-paste text for the Copy button. */
export function toPlainText(type: OutputType, c: Record<string, unknown>): string {
  switch (type) {
    case 'linkedin': {
      const v = c as unknown as LinkedInPost
      return [v.hook, v.body, v.call_to_action, arr(v.hashtags).map(tag).join(' ')].filter(Boolean).join('\n\n')
    }
    case 'twitter': {
      const v = c as unknown as TwitterThread
      return arr(v.tweets).map((t) => str(t.text)).join('\n\n---\n\n') + `\n\n${arr(v.hashtags).map(tag).join(' ')}`
    }
    case 'advisory': {
      const v = c as unknown as Advisory
      return [
        `${v.advisory_id} | Severity: ${v.severity}`,
        v.title,
        v.summary,
        `Affected:\n${list(v.affected)}`,
        ...arr(v.sections).map((s) => `${s.heading}\n${s.content}`),
        `Recommendations:\n${list(v.recommendations)}`,
        `References:\n${list(v.references)}`,
      ].join('\n\n')
    }
    case 'executive_summary': {
      const v = c as unknown as ExecutiveSummary
      return [
        v.title,
        `Bottom line: ${v.bottom_line}`,
        `Key points:\n${list(v.key_points)}`,
        `Implications:\n${list(v.implications)}`,
        `Recommended actions:\n${list(v.recommended_actions)}`,
      ].join('\n\n')
    }
    case 'presentation': {
      const v = c as unknown as Presentation
      return [`${v.title}\n${v.subtitle}`, ...arr(v.slides).map((s, i) => `${i + 1}. ${s.title}\n${list(s.bullets)}`)].join('\n\n')
    }
    case 'infographic': {
      const v = c as unknown as Infographic
      return [
        v.title,
        v.subtitle,
        v.key_message,
        ...arr(v.sections).map((s) => `${s.key_stat_or_fact} | ${s.heading}\n${s.supporting_text}`),
        v.call_to_action,
      ].join('\n\n')
    }
    case 'video': {
      const v = c as unknown as VideoPackage
      return [v.title, v.logline, v.script].join('\n\n')
    }
  }
}
