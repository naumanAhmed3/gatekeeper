import Link from 'next/link';
import { appRows, type AppRow } from '@/lib/repo';
import { Nav } from '../nav';
import { LevelBadge } from '../ui';

export const dynamic = 'force-dynamic';

export default async function AppsPage() {
  let rows: AppRow[] = [];
  try {
    rows = await appRows();
  } catch {
    /* empty */
  }

  return (
    <>
      <Nav active="apps" />
      <main className="max-w-6xl mx-auto px-6 py-9">
        <h1 className="text-xl font-semibold tracking-tight gk-fade">
          Applications
        </h1>
        <p className="mt-1.5 text-[13.5px] text-neutral-500">
          {rows.length} connected systems that access is granted into.
        </p>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((a) => (
            <Link
              key={a.id}
              href={`/apps/${a.id}`}
              className="rounded-xl bg-surface ring-1 ring-edge hover:ring-brand/40 p-4 transition"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[14.5px] text-neutral-100 flex-1">
                  {a.name}
                </h3>
                <LevelBadge level={a.criticality} label={`${a.criticality} crit.`} />
              </div>
              <p className="mt-0.5 text-[12px] text-neutral-500">{a.category}</p>
              <div className="mt-3 pt-3 border-t border-edge-soft flex items-center gap-4 text-[11.5px] font-mono text-neutral-500">
                <span>{a.entitlementCount} entitlements</span>
                <span>{a.grantCount} grants</span>
              </div>
              {a.ownerName && (
                <p className="mt-1.5 text-[11px] text-neutral-600">
                  owner · {a.ownerName}
                </p>
              )}
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
