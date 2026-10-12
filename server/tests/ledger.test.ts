import { describe, it, expect } from 'vitest';
import { buildLedger, validateEntryMovement, daysBetween } from '../../lib/ledger';
import { Challan, Entry } from '../../lib/types';

describe('EYE Ledger Business Rules & Logic', () => {
  const mockChallan: Challan = {
    id: 'test-dc-01',
    dcNo: 'DC-ST-5000',
    openDate: '2026-10-01',
    openingQty: 5000,
    party: 'Artistic Milliners',
    article: '12oz Indigo Twill',
    status: 'OPEN',
    createdById: 'user-01',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  };

  it('correctly calculates running balance across IN and OUT rows', () => {
    const entries: Entry[] = [
      {
        id: 'e1',
        challanId: 'test-dc-01',
        entryDate: '2026-10-02',
        type: 'OUT',
        qty: 300,
        createdById: 'user-01',
        createdAt: '2026-10-02T09:00:00Z',
        updatedAt: '2026-10-02T09:00:00Z',
      },
      {
        id: 'e2',
        challanId: 'test-dc-01',
        entryDate: '2026-10-03',
        type: 'OUT',
        qty: 800,
        createdById: 'user-01',
        createdAt: '2026-10-03T09:00:00Z',
        updatedAt: '2026-10-03T09:00:00Z',
      },
      {
        id: 'e3',
        challanId: 'test-dc-01',
        entryDate: '2026-10-04',
        type: 'IN',
        qty: 200,
        createdById: 'user-01',
        createdAt: '2026-10-04T09:00:00Z',
        updatedAt: '2026-10-04T09:00:00Z',
      },
    ];

    const { rows, summary } = buildLedger(mockChallan, entries);

    // Row 1 (Opening): 5000
    expect(rows[0].isOpening).toBe(true);
    expect(rows[0].inQty).toBe(5000);
    expect(rows[0].balance).toBe(5000);

    // Row 2 (OUT 300): 4700
    expect(rows[1].outQty).toBe(300);
    expect(rows[1].balance).toBe(4700);

    // Row 3 (OUT 800): 3900
    expect(rows[2].outQty).toBe(800);
    expect(rows[2].balance).toBe(3900);

    // Row 4 (IN 200): 4100
    expect(rows[3].inQty).toBe(200);
    expect(rows[3].balance).toBe(4100);

    // Summary totals
    expect(summary.totalIn).toBe(5200); // 5000 opening + 200
    expect(summary.totalOut).toBe(1100); // 300 + 800
    expect(summary.currentBalance).toBe(4100);
    expect(summary.isClosed).toBe(false);
  });

  it('automatically marks DC as closed and sets balance to null ("—") when balance reaches exactly 0', () => {
    const entries: Entry[] = [
      {
        id: 'e1',
        challanId: 'test-dc-01',
        entryDate: '2026-10-02',
        type: 'OUT',
        qty: 3000,
        createdById: 'user-01',
        createdAt: '2026-10-02T09:00:00Z',
        updatedAt: '2026-10-02T09:00:00Z',
      },
      {
        id: 'e2',
        challanId: 'test-dc-01',
        entryDate: '2026-10-05',
        type: 'OUT',
        qty: 2000,
        createdById: 'user-01',
        createdAt: '2026-10-05T09:00:00Z',
        updatedAt: '2026-10-05T09:00:00Z',
      },
    ];

    const { rows, summary } = buildLedger(mockChallan, entries);

    expect(summary.currentBalance).toBe(0);
    expect(summary.isClosed).toBe(true);
    // When balance reaches 0, the final row balance is null (rendered as "—")
    expect(rows[2].balance).toBeNull();
  });

  it('rejects an OUT movement that exceeds the current balance with exact available figure', () => {
    const entries: Entry[] = [
      {
        id: 'e1',
        challanId: 'test-dc-01',
        entryDate: '2026-10-02',
        type: 'OUT',
        qty: 300,
        createdById: 'user-01',
        createdAt: '2026-10-02T09:00:00Z',
        updatedAt: '2026-10-02T09:00:00Z',
      },
    ];

    // Attempting to withdraw 5000 when only 4700 is available
    const result = validateEntryMovement(mockChallan, entries, {
      entryDate: '2026-10-03',
      type: 'OUT',
      qty: 5000,
    });

    expect(result.valid).toBe(false);
    expect(result.errorMessage).toContain('Only 4,700 available, you entered 5,000');
  });

  it('rejects entry dates before the DC openDate', () => {
    const result = validateEntryMovement(mockChallan, [], {
      entryDate: '2026-09-28', // before 2026-10-01
      type: 'OUT',
      qty: 100,
    });

    expect(result.valid).toBe(false);
    expect(result.errorMessage).toContain('cannot be before DC open date');
  });

  it('computes production gaps and triggers gap divider for gaps > 1 day', () => {
    const entries: Entry[] = [
      {
        id: 'e1',
        challanId: 'test-dc-01',
        entryDate: '2026-10-04', // 3 days after openDate (2026-10-01)
        type: 'OUT',
        qty: 500,
        createdById: 'user-01',
        createdAt: '2026-10-04T09:00:00Z',
        updatedAt: '2026-10-04T09:00:00Z',
      },
      {
        id: 'e2',
        challanId: 'test-dc-01',
        entryDate: '2026-10-05', // 1 day after previous entry
        type: 'OUT',
        qty: 500,
        createdById: 'user-01',
        createdAt: '2026-10-05T09:00:00Z',
        updatedAt: '2026-10-05T09:00:00Z',
      },
    ];

    const { rows, summary } = buildLedger(mockChallan, entries);

    expect(rows[1].gapDays).toBe(3);
    expect(rows[1].hasGapDivider).toBe(true); // gap > 1 day triggers divider

    expect(rows[2].gapDays).toBe(1);
    expect(rows[2].hasGapDivider).toBe(false);

    expect(summary.longestGap).toBe(3);
  });
});
