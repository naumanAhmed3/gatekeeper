import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getIdentity,
  grantsForIdentity,
  requestsForIdentity,
  violationsForIdentity,
} from '@/lib/repo';
import { ageDays, fmtDate, relativeTime } from '@/lib/format';
import { Nav } from '../../nav';
import { Avatar, KindIcon, LevelBadge, StatusPill, VIOLATION_LABEL } from '../../ui';
import { RevokeButton } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function IdentityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identity = await getIdentity(id);
  if (!identity) notFound();

  const [grants, violations, requests] = await Promise.all([
    grantsForIdentity(id),
    violationsForIdentity(id),
    requestsForIdentity(id),
  ]);
  const activeGrants = grants.filter((g) => g.status === 'active');

  return (
    <>
      <Nav active="identities" />
      <main className="max-w-4xl mx-auto px-6 py-9">
        <Link
          href="/identities"
          className="text-[12px] text-neutral-500 hover:text-neutral-300"
        >
          ← All identities
        </Link>

        <div className="mt-4 flex items-center gap-4 gk-fade">
          <Avatar name={identity.name} size={52} />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight">
                {identity.name}
              </h1>
              <StatusPill status={identity.status} />
            </div>
            <p className="mt-0.5 text-[13px] text-neutral-400">
              {identity.title} · {identity.department}
            </p>
            <p className="mt-0.5 text-[12px] font-mono text-neutral-600">
              {identity.email} · joined {fmtDate(identity.joinedAt)}
            </p>
          </div>
        </div>

        {/* Violations */}
        {violations.length > 0 && (
          <section className="mt-7">
            <h2 className="text-sm font-semibold text-neutral-300 mb-3">
              Policy violations
            </h2>
            <div className="space-y-2">
              {violations.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl bg-surface ring-1 ring-edge px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={
                        v.severity === 'high' ? 'text-high' : 'text-medium'
                      }
                    >
                      <KindIcon kind={v.kind} />
                    </span>
                    <span className="text-[13px] font-medium text-neutral-100">
                      {v.summary}
                    </span>
                    <LevelBadge level={v.severity} />
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-neutral-500 leading-relaxed">
                    {v.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Grants */}
        <section className="mt-7">
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">
            Access · {activeGrants.length} active grant
            {activeGrants.length === 1 ? '' : 's'}
          </h2>
          <div className="rounded-xl ring-1 ring-edge overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500 bg-surface-2">
                  <th className="px-4 py-2.5 font-medium">Entitlement</th>
                  <th className="px-4 py-2.5 font-medium">Risk</th>
                  <th className="px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5 font-medium">Last reviewed</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr
                    key={g.id}
                    className={`border-t border-edge-soft ${
                      g.status === 'revoked' ? 'bg-surface opacity-55' : 'bg-surface'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <Link href={`/apps/${g.appId}`} className="hover:text-white">
                        <span className="text-neutral-500">{g.appName}</span>
                        <span className="text-neutral-600"> · </span>
                        <span className="text-neutral-100">
                          {g.entitlementName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <LevelBadge level={g.entitlementRisk} />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11.5px] text-neutral-500">
                      {g.source}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-neutral-400">
                      {g.status === 'revoked' ? (
                        <span className="text-neutral-600">revoked</span>
                      ) : g.lastReviewedAt ? (
                        `${ageDays(g.lastReviewedAt)}d ago`
                      ) : (
                        <span className="text-medium">never</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {g.status === 'active' && <RevokeButton grantId={g.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Requests */}
        {requests.length > 0 && (
          <section className="mt-7">
            <h2 className="text-sm font-semibold text-neutral-300 mb-3">
              Access requests
            </h2>
            <div className="rounded-xl ring-1 ring-edge bg-surface divide-y divide-edge-soft">
              {requests.map((r) => (
                <div key={r.id} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-[13px] text-neutral-200 flex-1">
                    {r.appName} · {r.entitlementName}
                  </span>
                  <StatusPill status={r.status} />
                  <span className="text-[11px] text-neutral-600 w-16 text-right">
                    {relativeTime(r.requestedAt)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
