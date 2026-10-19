// Shapes of each artefact's JSON, mirroring backend/app/generators/schemas.py.
export interface Scene {
  number: number
  duration_seconds: number
  visual: string
  narration: string
  on_screen_text: string
}
export interface SubtitleLine {
  start: string
  end: string
  text: string
}
export interface VideoPackage {
  title: string
  logline: string
  script: string
  storyboard: Scene[]
  subtitles: SubtitleLine[]
  visual_recommendations: string[]
  music_and_tone: string
}
export interface LinkedInPost {
  hook: string
  body: string
  call_to_action: string
  hashtags: string[]
}
export interface TwitterThread {
  tweets: { text: string }[]
  hashtags: string[]
}
export interface Advisory {
  title: string
  advisory_id: string
  severity: string
  summary: string
  affected: string[]
  sections: { heading: string; content: string }[]
  recommendations: string[]
  references: string[]
}
export interface InfographicSection {
  heading: string
  key_stat_or_fact: string
  supporting_text: string
  icon_suggestion: string
}
export interface Infographic {
  title: string
  subtitle: string
  key_message: string
  sections: InfographicSection[]
  layout_recommendation: string
  color_palette: string[]
  call_to_action: string
}
export interface ExecutiveSummary {
  title: string
  bottom_line: string
  key_points: string[]
  implications: string[]
  recommended_actions: string[]
}
export interface Slide {
  title: string
  bullets: string[]
  speaker_notes: string
  visual_suggestion: string
}
export interface Presentation {
  title: string
  subtitle: string
  slides: Slide[]
}

export const arr = <T,>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : [])
export const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v))
