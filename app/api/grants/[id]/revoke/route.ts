import { NextResponse } from 'next/server';
import { revokeGrant } from '@/lib/repo';
import { authError, requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/grants/:id/revoke — revoke an active grant.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { actor } = requireAdmin(req);
    await revokeGrant(id, actor);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const auth = authError(e);
    if (auth) return auth;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 },
    );
  }
}
