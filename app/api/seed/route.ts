import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/seed — reset Gatekeeper to the demo dataset.
export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Seed failed' },
      { status: 500 },
    );
  }
}
