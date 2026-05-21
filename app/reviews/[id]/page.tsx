import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCampaign, reviewItemsForCampaign } from '@/lib/repo';
import { ageDays, fmtDate } from '@/lib/format';
import { Nav } from '../../nav';
import { Avatar, LevelBadge, StatusPill } from '../../ui';
import { ReviewActions } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const items = await reviewItemsForCampaign(id);

  const pending = items.filter((i) => i.decision === 'pending');
  const decided = items.filter((i) => i.decision !== 'pending');
  const pct = items.length
    ? Math.round((decided.length / items.length) * 100)
    : 0;

  return (
    <>
      <Nav active="reviews" />
      <main className="max-w-4xl mx-auto px-6 py-9">
        <Link
          href="/reviews"
          className="text-[12px] text-neutral-500 hover:text-neutral-300"
        >
          ← All reviews
        </Link>

        <div className="mt-4 flex items-center gap-3 gk-fade">
          <h1 className="text-xl font-semibold tracking-tight">
            {campaign.name}
          </h1>
          <StatusPill status={campaign.status} />
        </div>
        <p className="mt-1 text-[13px] text-neutral-500">
          Opened {fmtDate(campaign.createdAt)} · {items.length} grants in scope
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-edge overflow-hidden">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[12px] font-mono text-neutral-400">
            {decided.length} / {items.length} reviewed
          </span>
        </div>

        {/* Pending */}
        <section className="mt-7">
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">
            Awaiting certification
          </h2>
          {pending.length === 0 ? (
            <p className="text-[13px] text-neutral-500 rounded-xl bg-surface ring-1 ring-edge px-4 py-6 text-center">
              Every grant in this campaign has been reviewed.
            </p>
          ) : (
            <div className="space-y-2">
              {pending.map((it) => (
                <div
                  key={it.id}
                  className="rounded-xl bg-surface ring-1 ring-edge px-4 py-3 flex items-center gap-3"
                >
                  <Avatar name={it.identityName} size={30} />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/identities/${it.identityId}`}
                      className="text-[13px] font-medium text-neutral-100 hover:text-white"
                    >
                      {it.identityName}
                    </Link>
                    <div className="text-[12.5px] text-neutral-400">
                      {it.appName} · {it.entitlementName}
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <LevelBadge level={it.entitlementRisk} label={`${it.entitlementRisk} risk`} />
                    <div className="text-[10.5px] text-neutral-600 mt-1">
                      held {ageDays(it.grantedAt)}d
                    </div>
                  </div>
                  <ReviewActions itemId={it.id} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Decided */}
        {decided.length > 0 && (
          <section className="mt-7">
            <h2 className="text-sm font-semibold text-neutral-300 mb-3">
              Reviewed
            </h2>
            <div className="rounded-xl ring-1 ring-edge overflow-hidden divide-y divide-edge-soft">
              {decided.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-3 px-4 py-2.5 bg-surface"
                >
                  <span className="text-[13px] text-neutral-300 flex-1">
                    <span className="text-neutral-100">{it.identityName}</span> —{' '}
                    {it.appName} · {it.entitlementName}
                  </span>
                  <StatusPill status={it.decision} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
