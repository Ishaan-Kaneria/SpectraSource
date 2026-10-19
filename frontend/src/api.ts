import type { GenerationParams, Job, OutputType } from './types'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

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
  return handle(await fetch(`${BASE}/api/jobs`, { method: 'POST', body: form }))
}

export async function getJob(id: number): Promise<Job> {
  return handle(await fetch(`${BASE}/api/jobs/${id}`))
}
