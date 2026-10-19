import type { GenerationParams, Job, OutputType } from './types'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

// Free hosting puts the backend to sleep; the first request after a while can fail or take ~1 minute.
async function call(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch {
    throw new Error(`Can't reach the backend at ${BASE}. If it is hosted on a free plan it may be waking up; try again in a minute.`)
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail ?? detail
    } catch {
      /* not JSON */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
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
  return handle(await call(`${BASE}/api/jobs/${id}`))
}

export const downloadUrl = (artifactId: number, fmt: string) =>
  `${BASE}/api/artifacts/${artifactId}/download?fmt=${encodeURIComponent(fmt)}`
