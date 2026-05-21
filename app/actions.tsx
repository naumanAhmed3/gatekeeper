'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// ─────────────────────────────────────────────────────────────
// Client action components — each posts to an API route and then
// refreshes the server-rendered page.
// ─────────────────────────────────────────────────────────────

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (
    url: string,
    body?: unknown,
    onError?: (m: string) => void,
  ) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Action failed');
      }
      router.refresh();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Action failed');
      setBusy(false);
    }
  };
  return { busy, run };
}

const Spinner = () => (
  <span className="w-3 h-3 rounded-full border-2 border-current/30 border-t-current gk-spin" />
);

export function SeedButton({ label = 'Load demo data' }: { label?: string }) {
  const { busy, run } = useAction();
  return (
    <button
      onClick={() => run('/api/seed')}
      disabled={busy}
      className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-brand text-ink text-sm font-semibold hover:brightness-110 disabled:opacity-60 transition"
    >
      {busy && <Spinner />}
      {busy ? 'Loading…' : label}
    </button>
  );
}

export function RecomputeButton() {
  const { busy, run } = useAction();
  return (
    <button
      onClick={() => run('/api/recompute')}
      disabled={busy}
      className="inline-flex items-center gap-2 px-3 h-9 rounded-lg ring-1 ring-edge text-sm text-neutral-300 hover:text-white hover:ring-neutral-500 disabled:opacity-60 transition"
    >
      {busy && <Spinner />}
      {busy ? 'Evaluating…' : 'Re-run policy engine'}
    </button>
  );
}

export function RequestActions({ id }: { id: string }) {
  const { busy, run } = useAction();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => run(`/api/requests/${id}`, { decision: 'approved' })}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-low/15 text-low ring-1 ring-low/30 text-[12.5px] font-medium hover:bg-low/25 disabled:opacity-50 transition"
      >
        {busy && <Spinner />}Approve
      </button>
      <button
        onClick={() => run(`/api/requests/${id}`, { decision: 'denied' })}
        disabled={busy}
        className="px-2.5 h-8 rounded-lg ring-1 ring-edge text-[12.5px] text-neutral-400 hover:text-white hover:ring-neutral-500 disabled:opacity-50 transition"
      >
        Deny
      </button>
    </div>
  );
}

export function RevokeButton({ grantId }: { grantId: string }) {
  const { busy, run } = useAction();
  return (
    <button
      onClick={() => run(`/api/grants/${grantId}/revoke`)}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-[12px] text-high/90 hover:text-high disabled:opacity-50 transition"
    >
      {busy && <Spinner />}
      Revoke
    </button>
  );
}

export function ReviewActions({ itemId }: { itemId: string }) {
  const { busy, run } = useAction();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => run(`/api/review-items/${itemId}`, { decision: 'certified' })}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-low/15 text-low ring-1 ring-low/30 text-[12.5px] font-medium hover:bg-low/25 disabled:opacity-50 transition"
      >
        {busy && <Spinner />}Certify
      </button>
      <button
        onClick={() => run(`/api/review-items/${itemId}`, { decision: 'revoked' })}
        disabled={busy}
        className="px-2.5 h-8 rounded-lg bg-high/10 text-high ring-1 ring-high/30 text-[12.5px] font-medium hover:bg-high/20 disabled:opacity-50 transition"
      >
        Revoke
      </button>
    </div>
  );
}
