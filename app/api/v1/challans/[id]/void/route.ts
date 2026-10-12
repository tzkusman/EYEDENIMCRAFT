import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';

const VoidSchema = z.object({
  reason: z.string().min(3, 'A clear reason of at least 3 characters is required to void a DC'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = store.getCurrentUser();
    if (!permissions.canVoidDC(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only Admins can void a DC' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = VoidSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message || 'Invalid input',
          },
        },
        { status: 400 }
      );
    }

    const challan = store.voidChallan(id, parsed.data.reason, user);
    return NextResponse.json({ challan, message: 'Challan marked as VOID successfully' });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
