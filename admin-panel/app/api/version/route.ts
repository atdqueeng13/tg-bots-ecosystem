import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    status: 'ONLINE',
  });
}
