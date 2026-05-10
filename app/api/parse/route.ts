import { NextResponse } from 'next/server';
import { GeminiError, parseIdea } from '@/lib/gemini';
import { IDEA_MAX, PARSE_MIN } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const { idea } = (body ?? {}) as { idea?: unknown };

  if (typeof idea !== 'string') {
    return NextResponse.json({ error: 'MISSING' }, { status: 400 });
  }
  const trimmed = idea.trim();
  if (trimmed.length < PARSE_MIN) {
    return NextResponse.json({ error: 'TOO_SHORT' }, { status: 400 });
  }
  if (trimmed.length > IDEA_MAX) {
    return NextResponse.json({ error: 'TOO_LONG' }, { status: 400 });
  }

  try {
    const result = await parseIdea(trimmed);
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      const status =
        err.kind === 'CONFIG' ? 500 : err.kind === 'PARSE_FAILED' ? 502 : 503;
      return NextResponse.json({ error: err.kind }, { status });
    }
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
