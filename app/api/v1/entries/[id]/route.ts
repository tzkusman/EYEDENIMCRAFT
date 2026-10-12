import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';
import { validateEntryMovement, buildLedger } from '@/lib/ledger';

const UpdateEntrySchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date YYYY-MM-DD required').optional(),
  type: z.enum(['IN', 'OUT']).optional(),
  qty: z.number().int().positive('Quantity must be greater than 0').optional(),
  note: z.string().optional(),
  reason: z.string().min(3, 'A clear reason is strictly required to modify an entry'),
});

const DeleteEntrySchema = z.object({
  reason: z.string().min(3, 'A clear reason is strictly required to delete an entry'),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = store.getCurrentUser();
    const { id } = await params;
    const entry = store.getEntryById(id);
    if (!entry || entry.deletedAt) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Entry not found' } },
        { status: 404 }
      );
    }

    // Role and permission check
    if (!permissions.canEditEntry(user, entry)) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message:
              user.role === 'MERCHANDISER'
                ? 'Merchandisers can only edit their own entries created today.'
                : 'You are not authorized to edit this entry.',
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UpdateEntrySchema.safeParse(body);
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

    const challan = store.getChallanById(entry.challanId);
    if (!challan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Associated challan not found' } },
        { status: 404 }
      );
    }

    const newDate = parsed.data.entryDate || entry.entryDate;
    const newType = parsed.data.type || entry.type;
    const newQty = parsed.data.qty !== undefined ? parsed.data.qty : entry.qty;

    // Validate overspend and date rules
    const existingEntries = store.getEntriesByChallanId(challan.id);
    const validation = validateEntryMovement(challan, existingEntries, {
      entryDate: newDate,
      type: newType,
      qty: newQty,
      idToIgnore: entry.id,
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

    const { entry: updatedEntry, challan: updatedChallan } = store.updateEntry(
      id,
      {
        entryDate: parsed.data.entryDate,
        type: parsed.data.type,
        qty: parsed.data.qty,
        note: parsed.data.note,
        reason: parsed.data.reason,
      },
      user
    );

    const allEntries = store.getEntriesByChallanId(updatedChallan.id);
    const settings = store.getSettings();
    const { rows, summary } = buildLedger(updatedChallan, allEntries, settings.staleDays);

    return NextResponse.json({
      entry: updatedEntry,
      challan: updatedChallan,
      rows,
      summary,
      message: 'Entry updated successfully',
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = store.getCurrentUser();
    const { id } = await params;
    const entry = store.getEntryById(id);
    if (!entry || entry.deletedAt) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Entry not found' } },
        { status: 404 }
      );
    }

    if (!permissions.canDeleteEntry(user, entry)) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message:
              user.role === 'MERCHANDISER'
                ? 'Merchandisers can only delete their own entries created today.'
                : 'You are not authorized to delete this entry.',
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = DeleteEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message || 'A valid reason is required',
          },
        },
        { status: 400 }
      );
    }

    const { entry: deletedEntry, challan: updatedChallan } = store.deleteEntry(
      id,
      parsed.data.reason,
      user
    );

    const allEntries = store.getEntriesByChallanId(updatedChallan.id);
    const settings = store.getSettings();
    const { rows, summary } = buildLedger(updatedChallan, allEntries, settings.staleDays);

    return NextResponse.json({
      entry: deletedEntry,
      challan: updatedChallan,
      rows,
      summary,
      message: 'Entry soft-deleted successfully',
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
