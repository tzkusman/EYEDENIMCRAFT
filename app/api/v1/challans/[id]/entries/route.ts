import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';
import { validateEntryMovement, buildLedger } from '@/lib/ledger';

const AddEntrySchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date YYYY-MM-DD required'),
  type: z.enum(['IN', 'OUT']),
  qty: z.number().int().positive('Quantity must be greater than 0'),
  note: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = store.getCurrentUser();
    if (!permissions.canAddEntry(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You are not authorized to add entries' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    await store.syncWithSupabase();
    const challan = store.getChallanById(id);
    if (!challan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Challan not found' } },
        { status: 404 }
      );
    }

    if (challan.status === 'VOID') {
      return NextResponse.json(
        { error: { code: 'CHALLAN_VOID', message: 'Cannot add entries to a voided DC' } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = AddEntrySchema.safeParse(body);
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

    const { entryDate, type, qty, note } = parsed.data;

    // Validate movement business rules
    const existingEntries = store.getEntriesByChallanId(challan.id);
    const validation = validateEntryMovement(challan, existingEntries, {
      entryDate,
      type,
      qty,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_MOVEMENT',
            message: validation.errorMessage || 'Invalid movement',
          },
        },
        { status: 400 }
      );
    }

    const { entry, challan: updatedChallan } = store.addEntry({
      challanId: challan.id,
      entryDate,
      type,
      qty,
      note,
      createdById: user.id,
    });

    const entries = store.getEntriesByChallanId(updatedChallan.id);
    const settings = store.getSettings();
    const { rows, summary } = buildLedger(updatedChallan, entries, settings.staleDays);

    return NextResponse.json(
      {
        entry,
        challan: updatedChallan,
        rows,
        summary,
        message: 'Movement recorded successfully',
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
