import { NextResponse } from 'next/server';
import { decideRequest } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/requests/:id { decision } — approve or deny a request.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { decision } = await req.json();
    if (decision !== 'approved' && decision !== 'denied') {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }
    await decideRequest(id, decision, 'Admin');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 },
    );
  }
}
