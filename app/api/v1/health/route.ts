import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'EYE',
    company: 'Denim Crafts',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
