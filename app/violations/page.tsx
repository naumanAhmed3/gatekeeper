import Link from 'next/link';
import { listViolations, type ViolationView } from '@/lib/repo';
import { riskScore } from '@/lib/policy';
import type { ViolationKind } from '@/lib/types';
import { Nav } from '../nav';
import { Avatar, KindIcon, LevelBadge, VIOLATION_LABEL } from '../ui';
import { RecomputeButton } from '../actions';

export const dynamic = 'force-dynamic';

const KIND_ORDER: ViolationKind[] = ['sod', 'orphaned', 'over_privileged', 'stale'];

const KIND_BLURB: Record<ViolationKind, string> = {
  sod: 'One person holds two entitlements that must be kept separate.',
  orphaned: 'A disabled account that still holds active access.',
  over_privileged: 'A person carrying an unusual number of high-risk entitlements.',
  stale: 'Long-held access that has not been re-certified.',
};

export default async function ViolationsPage() {
  let violations: ViolationView[] = [];
  let dbError = false;
  try {
    violations = await listViolations();
  } catch {
    dbError = true;
  }

  return (
    <>
      <Nav active="violations" />
      <main className="max-w-4xl mx-auto px-6 py-9">
        <div className="flex items-start justify-between gap-4 gk-fade">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Policy violations
            </h1>
            <p className="mt-1.5 text-[13.5px] text-neutral-500 max-w-xl">
              {violations.length} open findings · risk score{' '}
              <span className="text-neutral-300 font-medium">
                {riskScore(violations)}/100
              </span>
              . Recomputed automatically after every access change.
            </p>
          </div>
          <RecomputeButton />
        </div>

        {dbError && (
          <p className="mt-6 rounded-lg bg-high/10 ring-1 ring-high/25 px-4 py-3 text-sm text-high">
            Could not reach the database.
          </p>
        )}

        {!dbError && violations.length === 0 && (
          <p className="mt-8 rounded-2xl border border-dashed border-edge px-6 py-12 text-center text-[13px] text-neutral-500">
            No policy violations — the access graph is clean.
          </p>
        )}

        {KIND_ORDER.map((kind) => {
          const group = violations.filter((v) => v.kind === kind);
          if (group.length === 0) return null;
          return (
            <section key={kind} className="mt-7">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-neutral-400">
                  <KindIcon kind={kind} />
                </span>
                <h2 className="text-sm font-semibold text-neutral-200">
                  {VIOLATION_LABEL[kind]}
                </h2>
                <span className="text-[12px] text-neutral-600">
                  {group.length}
                </span>
              </div>
              <p className="text-[12px] text-neutral-600 mb-3">
                {KIND_BLURB[kind]}
              </p>
              <div className="space-y-2">
                {group.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl bg-surface ring-1 ring-edge px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/identities/${v.identityId}`}
                        className="flex items-center gap-2.5 min-w-0"
                      >
                        <Avatar name={v.identityName} size={26} />
                        <span className="text-[13px] font-medium text-neutral-100 truncate">
                          {v.identityName}
                        </span>
                      </Link>
                      <span className="text-[11px] text-neutral-600">
                        {v.identityDepartment}
                      </span>
                      <span className="ml-auto">
                        <LevelBadge level={v.severity} />
                      </span>
                    </div>
                    <div className="mt-1.5 text-[12.5px] font-medium text-neutral-300">
                      {v.summary}
                    </div>
                    <p className="mt-0.5 text-[12px] text-neutral-500 leading-relaxed">
                      {v.detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
