import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';
import { buildLedger } from '@/lib/ledger';

const UpdateChallanSchema = z.object({
  party: z.string().optional(),
  article: z.string().optional(),
  remarks: z.string().optional(),
  openingQty: z.number().int().positive().optional(),
  reason: z.string().optional(),
  // Disallowed field to check
  dcNo: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = store.getCurrentUser();
    if (!permissions.canViewAllDCs(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
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

    const entries = store.getEntriesByChallanId(challan.id);
    const settings = store.getSettings();
    const { rows, summary } = buildLedger(challan, entries, settings.staleDays);

    return NextResponse.json({
      challan,
      rows,
      summary,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = store.getCurrentUser();
    const { id } = await params;
    const challan = store.getChallanById(id);
    if (!challan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Challan not found' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = UpdateChallanSchema.safeParse(body);
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

    // 1. IMMUTABILITY RULE: Reject any attempt to change dcNo
    if (parsed.data.dcNo !== undefined && parsed.data.dcNo !== challan.dcNo) {
      return NextResponse.json(
        {
          error: {
            code: 'IMMUTABLE_FIELD',
            message: 'DC No is strictly immutable and cannot be edited. It was assigned upon opening.',
          },
        },
        { status: 400 }
      );
    }

    // 2. Opening Qty modification check
    if (
      parsed.data.openingQty !== undefined &&
      parsed.data.openingQty !== challan.openingQty
    ) {
      if (!permissions.canEditOpeningQty(user)) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Only Managers and Admins can modify the Opening Quantity.',
            },
          },
          { status: 403 }
        );
      }
      if (!parsed.data.reason || !parsed.data.reason.trim()) {
        return NextResponse.json(
          {
            error: {
              code: 'REASON_REQUIRED',
              message: 'A reason is strictly required to modify the Opening Quantity.',
            },
          },
          { status: 400 }
        );
      }
    }

    const updated = store.updateChallan(
      id,
      {
        party: parsed.data.party,
        article: parsed.data.article,
        remarks: parsed.data.remarks,
        openingQty: parsed.data.openingQty,
        reason: parsed.data.reason,
      },
      user
    );

    const entries = store.getEntriesByChallanId(updated.id);
    const settings = store.getSettings();
    const { rows, summary } = buildLedger(updated, entries, settings.staleDays);

    return NextResponse.json({
      challan: updated,
      rows,
      summary,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
