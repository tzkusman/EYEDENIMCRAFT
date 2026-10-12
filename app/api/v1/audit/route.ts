import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const user = store.getCurrentUser();
    if (!permissions.canViewAuditLog(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only Managers and Admins can view the audit log' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userQuery = searchParams.get('userId');
    const actionQuery = searchParams.get('action');
    const entityQuery = searchParams.get('entity');
    const dateQuery = searchParams.get('date');

    let logs = store.getAuditLogs();

    if (userQuery) {
      logs = logs.filter(l => l.userId === userQuery);
    }
    if (actionQuery) {
      logs = logs.filter(l => l.action === actionQuery);
    }
    if (entityQuery) {
      logs = logs.filter(l => l.entity === entityQuery);
    }
    if (dateQuery) {
      logs = logs.filter(l => l.createdAt.startsWith(dateQuery));
    }

    return NextResponse.json({ logs });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
