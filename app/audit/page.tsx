import { listAudit } from '@/lib/repo';
import type { AuditEvent } from '@/lib/types';
import { fmtTime } from '@/lib/format';
import { Nav } from '../nav';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  let events: AuditEvent[] = [];
  try {
    events = await listAudit(100);
  } catch {
    /* empty */
  }

  return (
    <>
      <Nav active="audit" />
      <main className="max-w-3xl mx-auto px-6 py-9">
        <h1 className="text-xl font-semibold tracking-tight gk-fade">
          Audit log
        </h1>
        <p className="mt-1.5 text-[13.5px] text-neutral-500">
          An append-only record of every access decision — requests, grants,
          revocations, reviews.
        </p>

        <div className="mt-6 rounded-xl ring-1 ring-edge overflow-hidden divide-y divide-edge-soft">
          {events.map((e) => (
            <div key={e.id} className="flex gap-3 px-4 py-3 bg-surface">
              <span className="text-[10.5px] font-mono text-brand bg-brand/10 ring-1 ring-brand/20 rounded px-1.5 py-0.5 h-fit shrink-0">
                {e.action}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-neutral-200 leading-snug">
                  {e.summary}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-600">
                  {e.actor} · {fmtTime(e.at)}
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-neutral-500 bg-surface">
              No audit events yet.
            </div>
          )}
        </div>
      </main>
    </>
  );
}
