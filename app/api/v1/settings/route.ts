import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';

const SettingsSchema = z.object({
  staleDays: z.number().int().min(1).max(60).optional(),
  companyName: z.string().min(1).optional(),
});

export async function GET() {
  const settings = store.getSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  try {
    const user = store.getCurrentUser();
    if (!permissions.canManageSettings(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only Admins can update system settings' } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = SettingsSchema.safeParse(body);
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

    const updated = store.updateSettings(parsed.data, user);
    return NextResponse.json({ settings: updated, message: 'Settings updated successfully' });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
