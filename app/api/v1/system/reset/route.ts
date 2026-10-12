import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';

export async function POST() {
  const user = store.getCurrentUser();
  if (!permissions.canManageSettings(user)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Only Admins can reset factory data.' } },
      { status: 403 }
    );
  }

  store.clearAllProductionData();
  return NextResponse.json({
    success: true,
    message: 'All production DCs and movement records have been cleared. Ready for real factory data.',
  });
}
