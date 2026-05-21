import Link from 'next/link';
import { listCampaigns } from '@/lib/repo';
import { fmtDate } from '@/lib/format';
import { Nav } from '../nav';
import { StatusPill } from '../ui';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  let campaigns: Awaited<ReturnType<typeof listCampaigns>> = [];
  try {
    campaigns = await listCampaigns();
  } catch {
    /* empty */
  }

  return (
    <>
      <Nav active="reviews" />
      <main className="max-w-4xl mx-auto px-6 py-9">
        <h1 className="text-xl font-semibold tracking-tight gk-fade">
          Access reviews
        </h1>
        <p className="mt-1.5 text-[13.5px] text-neutral-500">
          Certification campaigns — a reviewer re-confirms or revokes each grant
          in scope.
        </p>

        <div className="mt-6 space-y-3">
          {campaigns.map((c) => {
            const pct = c.total ? Math.round((c.decided / c.total) * 100) : 0;
            return (
              <Link
                key={c.id}
                href={`/reviews/${c.id}`}
                className="block rounded-xl bg-surface ring-1 ring-edge hover:ring-brand/40 p-4 transition"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-[14.5px] text-neutral-100 flex-1">
                    {c.name}
                  </h3>
                  <StatusPill status={c.status} />
                </div>
                <p className="mt-0.5 text-[12px] text-neutral-500">
                  Opened {fmtDate(c.createdAt)}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-edge overflow-hidden">
                    <div
                      className="h-full bg-brand transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11.5px] font-mono text-neutral-400">
                    {c.decided} / {c.total} reviewed
                  </span>
                </div>
              </Link>
            );
          })}
          {campaigns.length === 0 && (
            <p className="text-[13px] text-neutral-500 rounded-xl bg-surface ring-1 ring-edge px-4 py-6 text-center">
              No review campaigns.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
