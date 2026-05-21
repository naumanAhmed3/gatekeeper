import Link from 'next/link';
import {
  listAudit,
  listViolations,
  overviewStats,
  type ViolationView,
} from '@/lib/repo';
import { riskScore } from '@/lib/policy';
import type { AuditEvent } from '@/lib/types';
import { relativeTime } from '@/lib/format';
import { Nav } from './nav';
import { KindIcon, LevelBadge, VIOLATION_LABEL } from './ui';
import { SeedButton } from './actions';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let stats = {
    identityCount: 0,
    disabledCount: 0,
    appCount: 0,
    activeGrantCount: 0,
    pendingRequestCount: 0,
    violationCount: 0,
  };
  let violations: ViolationView[] = [];
  let audit: AuditEvent[] = [];
  let dbError = false;

  try {
    [stats, violations, audit] = await Promise.all([
      overviewStats(),
      listViolations(),
      listAudit(6),
    ]);
  } catch {
    dbError = true;
  }

  const score = riskScore(violations);
  const sev = {
    high: violations.filter((v) => v.severity === 'high').length,
    medium: violations.filter((v) => v.severity === 'medium').length,
    low: violations.filter((v) => v.severity === 'low').length,
  };
  const byKind = (['sod', 'orphaned', 'stale', 'over_privileged'] as const).map(
    (k) => ({ kind: k, count: violations.filter((v) => v.kind === k).length }),
  );

  const scoreColor =
    score >= 60 ? 'text-high' : score >= 30 ? 'text-medium' : 'text-low';
  const scoreBar =
    score >= 60 ? 'bg-high' : score >= 30 ? 'bg-medium' : 'bg-low';

  return (
    <>
      <Nav active="overview" />
      <main className="max-w-6xl mx-auto px-6 py-9">
        <section className="gk-fade">
          <h1 className="text-2xl font-semibold tracking-tight">
            Access governance overview
          </h1>
          <p className="mt-2 text-[14.5px] text-neutral-400 max-w-2xl leading-relaxed">
            Who can access what, why, and whether they still should. Gatekeeper
            tracks every grant, runs a policy engine over the access graph, and
            keeps an immutable record of every decision.
          </p>
        </section>

        {dbError && (
          <p className="mt-6 rounded-lg bg-high/10 ring-1 ring-high/25 px-4 py-3 text-sm text-high">
            Could not reach the database. Check the DATABASE_URL configuration.
          </p>
        )}

        {!dbError && stats.identityCount === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-edge px-6 py-14 text-center gk-fade">
            <h2 className="text-base font-medium text-neutral-200">
              No data loaded
            </h2>
            <p className="mt-2 mb-5 text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
              Load the demo dataset — a mid-size company&apos;s identities, apps
              and grants, with real governance risks for the policy engine to
              find.
            </p>
            <div className="flex justify-center">
              <SeedButton />
            </div>
          </div>
        )}

        {!dbError && stats.identityCount > 0 && (
          <>
            {/* Risk panel */}
            <section className="mt-7 rounded-2xl bg-surface ring-1 ring-edge p-5 gk-fade">
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                    Workspace risk score
                  </div>
                  <div className={`mt-1 text-5xl font-semibold tabular-nums ${scoreColor}`}>
                    {score}
                    <span className="text-xl text-neutral-600">/100</span>
                  </div>
                </div>
                <div className="flex-1 min-w-[240px]">
                  <div className="h-2.5 rounded-full bg-edge overflow-hidden">
                    <div
                      className={`h-full ${scoreBar} transition-all`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center gap-4 text-[12.5px] text-neutral-400">
                    <span>
                      <span className="text-high font-semibold">{sev.high}</span>{' '}
                      high
                    </span>
                    <span>
                      <span className="text-medium font-semibold">
                        {sev.medium}
                      </span>{' '}
                      medium
                    </span>
                    <span>
                      <span className="text-low font-semibold">{sev.low}</span>{' '}
                      low
                    </span>
                    <Link
                      href="/violations"
                      className="ml-auto text-brand hover:underline"
                    >
                      {stats.violationCount} open violations →
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Identities" value={stats.identityCount} href="/identities" sub={`${stats.disabledCount} disabled`} />
              <Stat label="Applications" value={stats.appCount} href="/apps" />
              <Stat label="Active grants" value={stats.activeGrantCount} href="/identities" />
              <Stat
                label="Pending requests"
                value={stats.pendingRequestCount}
                href="/requests"
                highlight={stats.pendingRequestCount > 0}
              />
            </section>

            <div className="mt-8 grid lg:grid-cols-2 gap-6">
              {/* Violations by kind */}
              <section>
                <h2 className="text-sm font-semibold text-neutral-300 mb-3">
                  Policy findings
                </h2>
                <div className="rounded-xl ring-1 ring-edge overflow-hidden divide-y divide-edge-soft">
                  {byKind.map(({ kind, count }) => (
                    <Link
                      key={kind}
                      href="/violations"
                      className="flex items-center gap-3 px-4 py-3 bg-surface hover:bg-surface-2 transition"
                    >
                      <span className="text-neutral-500">
                        <KindIcon kind={kind} />
                      </span>
                      <span className="text-[13px] text-neutral-200 flex-1">
                        {VIOLATION_LABEL[kind]}
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          count > 0 ? 'text-neutral-100' : 'text-neutral-600'
                        }`}
                      >
                        {count}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Recent audit */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-neutral-300">
                    Recent activity
                  </h2>
                  <Link href="/audit" className="text-[12px] text-brand hover:underline">
                    Full audit log →
                  </Link>
                </div>
                <div className="rounded-xl ring-1 ring-edge bg-surface divide-y divide-edge-soft">
                  {audit.map((e) => (
                    <div key={e.id} className="px-4 py-2.5">
                      <div className="text-[12.5px] text-neutral-300 leading-snug">
                        {e.summary}
                      </div>
                      <div className="mt-0.5 text-[11px] text-neutral-600">
                        {e.actor} · {relativeTime(e.at)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  href,
  sub,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl bg-surface ring-1 px-4 py-3.5 transition hover:ring-brand/40 ${
        highlight ? 'ring-medium/35' : 'ring-edge'
      }`}
    >
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-neutral-600 mt-0.5">{sub}</div>}
    </Link>
  );
}
