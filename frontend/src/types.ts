export const OUTPUT_TYPES = [
  { id: 'presentation', label: 'Presentation', blurb: 'Slide deck with speaker notes' },
  { id: 'advisory', label: 'Advisory', blurb: 'Formal security advisory' },
  { id: 'executive_summary', label: 'Executive summary', blurb: 'One-page brief for leadership' },
  { id: 'infographic', label: 'Infographic', blurb: 'Key facts as a visual poster' },
  { id: 'linkedin', label: 'LinkedIn post', blurb: 'Professional social post' },
  { id: 'twitter', label: 'X thread', blurb: 'Short public thread' },
  { id: 'video', label: 'Video package', blurb: 'Script, storyboard and subtitles' },
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
  export_formats: string[]
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

export interface JobSummary {
  id: number
  status: Status
  source_name: string | null
  source_kind?: string
  source_preview?: string
  output_types: OutputType[]
  artifact_statuses?: Partial<Record<OutputType, Status>>
  created_at: string
}

export interface AuditVerify {
  valid: boolean
  entries: number
  broken_at: number | null
}

export interface ArtifactVerify {
  artifact_id: number
  content_hash: string | null
  recomputed_hash: string | null
  hash_matches: boolean
  audit_event_id: number | null
  audit_event_hash: string | null
  audit_recorded: boolean
  chain_valid: boolean
  chain_entries: number
  verified: boolean
}

export const labelFor = (t: OutputType) => OUTPUT_TYPES.find((o) => o.id === t)?.label ?? t
