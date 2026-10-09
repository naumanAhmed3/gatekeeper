import { NextResponse } from 'next/server';
import { decideRequest } from '@/lib/repo';
import { authError, requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/requests/:id { decision } — approve or deny a request.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { actor } = requireAdmin(req);
    const { decision } = await req.json();
    if (decision !== 'approved' && decision !== 'denied') {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }
    await decideRequest(id, decision, actor);
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
