export const OUTPUT_TYPES = [
  { id: 'video', label: 'Video package' },
  { id: 'linkedin', label: 'LinkedIn post' },
  { id: 'twitter', label: 'Twitter/X thread' },
  { id: 'advisory', label: 'Advisory' },
  { id: 'infographic', label: 'Infographic' },
  { id: 'executive_summary', label: 'Executive summary' },
  { id: 'presentation', label: 'Presentation' },
] as const

export type OutputType = (typeof OUTPUT_TYPES)[number]['id']
export type Status = 'pending' | 'running' | 'done' | 'failed'

export interface GenerationParams {
  audience: string
  tone: string
  language: string
  detail_level: 'brief' | 'medium' | 'detailed'
  objective: string
  style: string
}

export interface Artifact {
  id: number
  output_type: OutputType
  status: Status
  content: Record<string, unknown> | null
  error: string | null
  content_hash: string | null
}

export interface Job {
  id: number
  status: Status
  source_kind: string
  source_name: string | null
  source_preview: string
  params: GenerationParams
  created_at: string
  artifacts: Artifact[]
}

export const labelFor = (t: OutputType) => OUTPUT_TYPES.find((o) => o.id === t)?.label ?? t
