import { NextResponse } from 'next/server';
import { decideReviewItem } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/review-items/:id { decision } — certify or revoke a grant
// during an access-review campaign.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { decision } = await req.json();
    if (decision !== 'certified' && decision !== 'revoked') {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }
    await decideReviewItem(id, decision, 'Admin');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 },
    );
  }
}
