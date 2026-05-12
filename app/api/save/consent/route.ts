import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const { id, allowContentUse } = (body ?? {}) as {
    id?: unknown;
    allowContentUse?: unknown;
  };

  if (typeof id !== 'string' || !UUID.test(id)) {
    return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
  }
  if (typeof allowContentUse !== 'boolean') {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  try {
    const supabase = getServerSupabase();
    const { error } = await supabase
      .from('ship_check_ideas')
      .update({ allow_content_use: allowContentUse })
      .eq('id', id);
    if (error) {
      console.error('[save/consent] supabase:', error.message);
      return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[save/consent] unexpected:', err);
    return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
  }
}
