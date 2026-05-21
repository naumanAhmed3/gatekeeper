import Link from 'next/link';
import { listRequests, type RequestView } from '@/lib/repo';
import { relativeTime } from '@/lib/format';
import { Nav } from '../nav';
import { Avatar, LevelBadge, StatusPill } from '../ui';
import { RequestActions } from '../actions';

export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  let requests: RequestView[] = [];
  try {
    requests = await listRequests();
  } catch {
    /* empty */
  }
  const pending = requests.filter((r) => r.status === 'pending');
  const decided = requests.filter((r) => r.status !== 'pending');

  return (
    <>
      <Nav active="requests" />
      <main className="max-w-4xl mx-auto px-6 py-9">
        <h1 className="text-xl font-semibold tracking-tight gk-fade">
          Access requests
        </h1>
        <p className="mt-1.5 text-[13.5px] text-neutral-500">
          {pending.length} awaiting a decision. Approving provisions a grant and
          writes to the audit log.
        </p>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">
            Pending
          </h2>
          {pending.length === 0 ? (
            <p className="text-[13px] text-neutral-500 rounded-xl bg-surface ring-1 ring-edge px-4 py-6 text-center">
              Nothing pending — the queue is clear.
            </p>
          ) : (
            <div className="space-y-2.5">
              {pending.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl bg-surface ring-1 ring-edge p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={r.identityName} size={30} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/identities/${r.identityId}`}
                          className="text-[13.5px] font-medium text-neutral-100 hover:text-white"
                        >
                          {r.identityName}
                        </Link>
                        <span className="text-[12px] text-neutral-600">
                          {r.identityTitle}
                        </span>
                      </div>
                      <div className="text-[12.5px] text-neutral-400 mt-0.5">
                        requests{' '}
                        <span className="text-neutral-200">
                          {r.appName} · {r.entitlementName}
                        </span>
                      </div>
                    </div>
                    <LevelBadge level={r.entitlementRisk} label={`${r.entitlementRisk} risk`} />
                    <RequestActions id={r.id} />
                  </div>
                  <p className="mt-2.5 ml-[42px] text-[12.5px] text-neutral-500 leading-relaxed">
                    “{r.justification}” · {relativeTime(r.requestedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {decided.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-neutral-300 mb-3">
              Decided
            </h2>
            <div className="rounded-xl ring-1 ring-edge overflow-hidden divide-y divide-edge-soft">
              {decided.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-2.5 bg-surface"
                >
                  <span className="text-[13px] text-neutral-300 flex-1">
                    <span className="text-neutral-100">{r.identityName}</span> —{' '}
                    {r.appName} · {r.entitlementName}
                  </span>
                  <StatusPill status={r.status} />
                  {r.decidedBy && (
                    <span className="text-[11px] text-neutral-600">
                      by {r.decidedBy}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
