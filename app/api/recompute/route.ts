import { NextResponse } from 'next/server';
import { recomputeViolations } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/recompute — re-run the policy engine over the access graph.
export async function POST() {
  try {
    const count = await recomputeViolations();
    return NextResponse.json({ violations: count });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 },
    );
  }
}
