import { NextRequest, NextResponse } from 'next/server';
import { handleDialogueRuntime } from '@/lib/dialogue-runtime';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await handleDialogueRuntime(body);
    return NextResponse.json(result, { status: result.success === false && result.error?.includes('required') ? 400 : 200 });
  } catch (error: any) {
    console.error('Dialogue runtime route error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Dialogue error' }, { status: 500 });
  }
}
