import { NextResponse } from 'next/server';
import { recomputeViolations } from '@/lib/repo';
import { authError, requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/recompute — re-run the policy engine over the access graph.
export async function POST(req: Request) {
  try {
    requireAdmin(req);
    const count = await recomputeViolations();
    return NextResponse.json({ violations: count });
  } catch (e) {
    const auth = authError(e);
    if (auth) return auth;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 },
    );
  }
}
