import Link from 'next/link';
import { identityRows, type IdentityRow } from '@/lib/repo';
import { Nav } from '../nav';
import { Avatar, StatusPill } from '../ui';

export const dynamic = 'force-dynamic';

export default async function IdentitiesPage() {
  let rows: IdentityRow[] = [];
  try {
    rows = await identityRows();
  } catch {
    /* empty */
  }

  return (
    <>
      <Nav active="identities" />
      <main className="max-w-6xl mx-auto px-6 py-9">
        <h1 className="text-xl font-semibold tracking-tight gk-fade">
          Identities
        </h1>
        <p className="mt-1.5 text-[13.5px] text-neutral-500">
          {rows.length} people · everyone who can hold access.
        </p>

        <div className="mt-6 rounded-xl ring-1 ring-edge overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500 bg-surface-2">
                <th className="px-4 py-2.5 font-medium">Person</th>
                <th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Grants</th>
                <th className="px-4 py-2.5 font-medium text-right">Violations</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-edge-soft bg-surface hover:bg-surface-2 transition"
                >
                  <td className="px-4 py-2.5">
                    <Link href={`/identities/${r.id}`} className="flex items-center gap-3">
                      <Avatar name={r.name} size={30} />
                      <span>
                        <span className="text-neutral-100 font-medium block leading-tight">
                          {r.name}
                        </span>
                        <span className="text-[11.5px] text-neutral-500">
                          {r.title}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-400">{r.department}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-neutral-300">
                    {r.grantCount}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {r.violationCount > 0 ? (
                      <span className="text-high font-semibold">
                        {r.violationCount}
                      </span>
                    ) : (
                      <span className="text-neutral-600">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
