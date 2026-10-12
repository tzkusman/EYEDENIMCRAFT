import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';
import { buildLedger } from '@/lib/ledger';

const CreateChallanSchema = z.object({
  dcNo: z.string().min(1, 'DC No is required'),
  openDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date YYYY-MM-DD required'),
  openingQty: z.number().int().positive('Opening quantity must be greater than 0'),
  party: z.string().optional(),
  article: z.string().optional(),
  remarks: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = store.getCurrentUser();
    if (!permissions.canViewAllDCs(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const status = searchParams.get('status') || '';
    const party = searchParams.get('party') || '';
    const staleOnly = searchParams.get('staleOnly') === 'true';

    const settings = store.getSettings();
    await store.syncWithSupabase();
    let challans = store.getChallans();

    // Map each challan with summary and running balance
    const enriched = challans.map(challan => {
      const entries = store.getEntriesByChallanId(challan.id);
      const { summary } = buildLedger(challan, entries, settings.staleDays);
      return {
        ...challan,
        summary,
      };
    });

    let filtered = enriched;

    if (search) {
      filtered = filtered.filter(
        c =>
          c.dcNo.toLowerCase().includes(search) ||
          (c.party && c.party.toLowerCase().includes(search)) ||
          (c.article && c.article.toLowerCase().includes(search)) ||
          (c.remarks && c.remarks.toLowerCase().includes(search))
      );
    }

    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }

    if (party) {
      filtered = filtered.filter(c => c.party && c.party.toLowerCase() === party.toLowerCase());
    }

    if (staleOnly) {
      filtered = filtered.filter(c => c.summary.isStale);
    }

    return NextResponse.json({
      challans: filtered,
      totalCount: filtered.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = store.getCurrentUser();
    if (!permissions.canOpenDC(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You are not authorized to open a DC' } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreateChallanSchema.safeParse(body);
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

    const { dcNo, openDate, openingQty, party, article, remarks } = parsed.data;

    // Check if DC already exists
    const cleanDcNo = dcNo.trim().toUpperCase();
    const existing = store.getChallanByDcNo(cleanDcNo);
    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: 'DC_ALREADY_OPEN',
            message: `This DC No is already open (${cleanDcNo})`,
            existingId: existing.id,
          },
        },
        { status: 409 }
      );
    }

    const challan = store.createChallan({
      dcNo: cleanDcNo,
      openDate,
      openingQty,
      party,
      article,
      remarks,
      createdById: user.id,
    });

    return NextResponse.json({ challan }, { status: 201 });
  } catch (err) {
    const message = (err as Error).message;
    const isExists = message.includes('already open');
    return NextResponse.json(
      {
        error: {
          code: isExists ? 'DC_ALREADY_OPEN' : 'SERVER_ERROR',
          message,
        },
      },
      { status: isExists ? 409 : 500 }
    );
  }
}
