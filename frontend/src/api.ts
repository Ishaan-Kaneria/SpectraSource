import type { ArtifactVerify, AuditVerify, GenerationParams, Job, JobSummary, OutputType } from './types'

export const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const BASE = API_BASE

// Free hosting puts the backend to sleep; the first request after a while can take ~1 minute.
// Time out instead of leaving the UI stuck forever.
async function call(input: string, init?: RequestInit, timeoutMs = 120_000): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: ctrl.signal })
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === 'AbortError'
    throw new Error(
      timedOut
        ? `The backend at ${BASE} did not answer within ${Math.round(timeoutMs / 1000)} seconds.`
        : `Can't reach the backend at ${BASE}. Check that it is deployed and running.`,
    )
  } finally {
    clearTimeout(timer)
  }
}

export async function health(): Promise<{ status: string; llm_provider: string }> {
  return handle(await call(`${BASE}/health`, undefined, 90_000))
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail: unknown = res.statusText
    try {
      detail = (await res.json()).detail ?? detail
    } catch {
      /* not JSON */
    }
    // FastAPI validation errors arrive as a list of {loc, msg}.
    const text = Array.isArray(detail)
      ? detail.map((d: { msg?: string }) => d?.msg ?? String(d)).join('; ')
      : typeof detail === 'string'
        ? detail
        : JSON.stringify(detail)
    throw new Error(text)
  }
  return res.json() as Promise<T>
}

export async function createJob(input: {
  text: string
  file: File | null
  outputTypes: OutputType[]
  params: GenerationParams
}): Promise<Job> {
  const form = new FormData()
  form.append('output_types', JSON.stringify(input.outputTypes))
  form.append('params', JSON.stringify(input.params))
  if (input.text.trim()) form.append('text', input.text)
  if (input.file) form.append('file', input.file)
  return handle(await call(`${BASE}/api/jobs`, { method: 'POST', body: form }))
}

export async function getJob(id: number): Promise<Job> {
  return handle(await call(`${BASE}/api/jobs/${id}`, undefined, 30_000))
}

export const downloadUrl = (artifactId: number, fmt: string) =>
  `${BASE}/api/artifacts/${artifactId}/download?fmt=${encodeURIComponent(fmt)}`

export async function listJobs(limit = 30): Promise<JobSummary[]> {
  return handle(await call(`${BASE}/api/jobs?limit=${limit}`, undefined, 30_000))
}

export async function verifyAudit(): Promise<AuditVerify> {
  return handle(await call(`${BASE}/api/audit/verify`, undefined, 30_000))
}

export async function verifyArtifact(id: number): Promise<ArtifactVerify> {
  return handle(await call(`${BASE}/api/artifacts/${id}/verify`, undefined, 30_000))
}
