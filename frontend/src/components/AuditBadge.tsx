import { CircleCheck, CircleX, Fingerprint, ShieldCheck, ShieldQuestion, ShieldX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { verifyArtifact, verifyAudit } from '../api'
import type { ArtifactVerify, AuditVerify } from '../types'
import { Popover } from './Popover'
import { Spinner } from './ui'
import { cx } from '../lib/cx'

type State<T> = { kind: 'loading' } | { kind: 'ok'; data: T } | { kind: 'error'; message: string }

const pill = 'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors'

/** Whole-ledger check from /api/audit/verify. `refreshKey` re-runs it after new work is recorded. */
export function ChainBadge({ refreshKey }: { refreshKey: unknown }) {
  const [state, setState] = useState<State<AuditVerify>>({ kind: 'loading' })

  useEffect(() => {
    let live = true
    verifyAudit()
      .then((data) => live && setState({ kind: 'ok', data }))
      .catch((e) => live && setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      live = false
    }
  }, [refreshKey])

  const valid = state.kind === 'ok' && state.data.valid
  const broken = state.kind === 'ok' && !state.data.valid
  const Icon = state.kind === 'loading' ? Spinner : valid ? ShieldCheck : broken ? ShieldX : ShieldQuestion

  return (
    <Popover
      label="Audit ledger status"
      triggerClassName={cx(
        pill,
        valid && 'border-ok/40 bg-ok-soft text-ok-ink hover:border-ok',
        broken && 'border-bad/40 bg-bad-soft text-bad-ink hover:border-bad',
        !valid && !broken && 'border-line bg-surface-2 text-ink-muted hover:border-line-strong',
      )}
      trigger={
        <>
          <Icon className="size-4" />
          <span className="hidden sm:inline">
            {state.kind === 'loading' ? 'Checking ledger' : valid ? 'Ledger verified' : broken ? 'Ledger tampered' : 'Ledger unknown'}
          </span>
          <span className="sr-only sm:hidden">{valid ? 'Ledger verified' : broken ? 'Ledger tampered' : 'Ledger status'}</span>
        </>
      }
    >
      <h3 className="mb-1 flex items-center gap-2 font-semibold text-ink">
        <Fingerprint className="size-4 text-brand-ink" /> Tamper-evident audit ledger
      </h3>
      <p className="mb-3 text-ink-muted">
        Every job and every generated output is appended to a hash chain. Each entry's hash covers the one before it, so
        editing or deleting any past record breaks the chain.
      </p>
      {state.kind === 'ok' && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt className="text-ink-muted">Status</dt>
          <dd className={cx('font-medium', valid ? 'text-ok-ink' : 'text-bad-ink')}>{valid ? 'Chain intact' : 'Chain broken'}</dd>
          <dt className="text-ink-muted">Entries</dt>
          <dd className="font-mono text-ink">{state.data.entries}</dd>
          {state.data.broken_at != null && (
            <>
              <dt className="text-ink-muted">First bad entry</dt>
              <dd className="font-mono text-bad-ink">#{state.data.broken_at}</dd>
            </>
          )}
        </dl>
      )}
      {state.kind === 'error' && <p className="text-bad-ink">{state.message}</p>}
    </Popover>
  )
}

/** Per-output check: stored hash, recomputed hash and ledger entry all agree. */
export function ArtifactBadge({ artifactId, fallbackHash }: { artifactId: number; fallbackHash: string | null }) {
  const [state, setState] = useState<State<ArtifactVerify>>({ kind: 'loading' })

  useEffect(() => {
    let live = true
    verifyArtifact(artifactId)
      .then((data) => live && setState({ kind: 'ok', data }))
      .catch((e) => live && setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      live = false
    }
  }, [artifactId])

  const ok = state.kind === 'ok' && state.data.verified
  const bad = state.kind === 'ok' && !state.data.verified
  const hash = (state.kind === 'ok' && state.data.content_hash) || fallbackHash

  return (
    <Popover
      align="left"
      label="Output integrity"
      triggerClassName={cx(
        pill,
        ok && 'border-ok/40 bg-ok-soft text-ok-ink hover:border-ok',
        bad && 'border-bad/40 bg-bad-soft text-bad-ink hover:border-bad',
        !ok && !bad && 'border-line bg-surface-2 text-ink-muted hover:border-line-strong',
      )}
      trigger={
        <>
          {state.kind === 'loading' ? <Spinner className="size-3.5" /> : ok ? <ShieldCheck className="size-4" /> : bad ? <ShieldX className="size-4" /> : <Fingerprint className="size-4" />}
          <span>{state.kind === 'loading' ? 'Verifying' : ok ? 'Verified' : bad ? 'Mismatch' : 'SHA-256'}</span>
          {hash && <span className="hidden font-mono md:inline">{hash.slice(0, 8)}</span>}
        </>
      }
    >
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink">
        <Fingerprint className="size-4 text-brand-ink" /> Output integrity
      </h3>
      {state.kind === 'ok' ? (
        <ul className="space-y-1.5">
          <Check ok={state.data.hash_matches} label="Content matches its stored SHA-256" />
          <Check ok={state.data.audit_recorded} label={`Hash recorded in ledger${state.data.audit_event_id ? ` (entry #${state.data.audit_event_id})` : ''}`} />
          <Check ok={state.data.chain_valid} label={`Ledger chain intact (${state.data.chain_entries} entries)`} />
        </ul>
      ) : state.kind === 'error' ? (
        <p className="text-ink-muted">Per-output verification isn't available on this server. Showing the stored hash only.</p>
      ) : (
        <p className="text-ink-muted">Checking…</p>
      )}
      {hash && (
        <p className="mt-3 break-all rounded-lg bg-surface-2 p-2 font-mono text-[11px] leading-relaxed text-ink-muted">{hash}</p>
      )}
    </Popover>
  )
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-ok" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-bad" />}
      <span className="text-ink">{label}</span>
      <span className="sr-only">{ok ? 'passed' : 'failed'}</span>
    </li>
  )
}
