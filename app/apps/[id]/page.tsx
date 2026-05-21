import Link from 'next/link';
import { notFound } from 'next/navigation';
import { entitlementsForApp, getApp, grantsForApp } from '@/lib/repo';
import { Nav } from '../../nav';
import { Avatar, LevelBadge } from '../../ui';

export const dynamic = 'force-dynamic';

export default async function AppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getApp(id);
  if (!app) notFound();

  const [entitlements, grants] = await Promise.all([
    entitlementsForApp(id),
    grantsForApp(id),
  ]);

  return (
    <>
      <Nav active="apps" />
      <main className="max-w-4xl mx-auto px-6 py-9">
        <Link
          href="/apps"
          className="text-[12px] text-neutral-500 hover:text-neutral-300"
        >
          ← All applications
        </Link>

        <div className="mt-4 flex items-center gap-3 gk-fade">
          <h1 className="text-xl font-semibold tracking-tight">{app.name}</h1>
          <LevelBadge level={app.criticality} label={`${app.criticality} criticality`} />
        </div>
        <p className="mt-1 text-[13px] text-neutral-500">
          {app.category} · {grants.length} people with active access
        </p>

        {/* Entitlements */}
        <section className="mt-7">
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">
            Entitlements
          </h2>
          <div className="space-y-2">
            {entitlements.map((e) => (
              <div
                key={e.id}
                className="rounded-xl bg-surface ring-1 ring-edge px-4 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[13.5px] font-medium text-neutral-100">
                    {e.name}
                  </span>
                  <LevelBadge level={e.risk} label={`${e.risk} risk`} />
                  <span className="ml-auto text-[12px] font-mono text-neutral-500">
                    {e.holders} holder{e.holders === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] text-neutral-500 leading-relaxed">
                  {e.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Access list */}
        <section className="mt-7">
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">
            Who has access
          </h2>
          <div className="rounded-xl ring-1 ring-edge overflow-hidden divide-y divide-edge-soft">
            {grants.map((g) => (
              <Link
                key={g.id}
                href={`/identities/${g.identityId}`}
                className="flex items-center gap-3 px-4 py-2.5 bg-surface hover:bg-surface-2 transition"
              >
                <Avatar name={g.identityName} size={28} />
                <span className="text-[13px] text-neutral-200 flex-1">
                  {g.identityName}
                </span>
                <span className="text-[12.5px] text-neutral-400">
                  {g.entitlementName}
                </span>
                <LevelBadge level={g.entitlementRisk} />
              </Link>
            ))}
            {grants.length === 0 && (
              <div className="px-4 py-6 text-center text-[13px] text-neutral-500 bg-surface">
                No active grants into this application.
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
