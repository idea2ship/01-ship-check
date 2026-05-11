import { NextResponse } from 'next/server';
import { evaluateIdea, LLMError } from '@/lib/llm';
import { normalizeParsedIdea, validateInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const { idea, successCriteria, parsedIdea } = (body ?? {}) as {
    idea?: unknown;
    successCriteria?: unknown;
    parsedIdea?: unknown;
  };

  const error = validateInput(idea, successCriteria);
  if (error) {
    return NextResponse.json({ error: error.kind, field: error.field }, { status: 400 });
  }

  const normalizedParsed = parsedIdea ? normalizeParsedIdea(parsedIdea) : null;

  try {
    const result = await evaluateIdea(
      idea as string,
      successCriteria as string,
      normalizedParsed,
    );
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof LLMError) {
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
