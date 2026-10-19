export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const STATUS_LABEL = { pending: 'Queued', running: 'Generating', done: 'Ready', failed: 'Failed' } as const
