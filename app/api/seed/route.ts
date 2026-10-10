import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/repo';
import { authError, requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/seed — reset Gatekeeper to the demo dataset.
export async function POST(req: Request) {
  try {
    requireAdmin(req);
    if (process.env.ENABLE_DESTRUCTIVE_SEED !== 'true') {
      return NextResponse.json({ error: 'Destructive seed is disabled' }, { status: 403 });
    }
    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (e) {
    const auth = authError(e);
    if (auth) return auth;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Seed failed' },
      { status: 500 },
    );
  }
}
