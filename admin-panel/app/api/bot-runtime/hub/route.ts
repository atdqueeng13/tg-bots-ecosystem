import { NextRequest, NextResponse } from 'next/server';
import { handleHubRuntime } from '@/lib/hub-runtime';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await handleHubRuntime(body);
    return NextResponse.json(result, { status: result.success === false && result.error?.includes('required') ? 400 : 200 });
  } catch (error: any) {
    console.error('Hub runtime route error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Hub error' }, { status: 500 });
  }
}
