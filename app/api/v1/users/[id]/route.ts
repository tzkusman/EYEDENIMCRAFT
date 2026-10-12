import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';

const UpdateUserSchema = z.object({
  fullName: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'MERCHANDISER']).optional(),
  isActive: z.boolean().optional(),
  resetPassword: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = store.getCurrentUser();
    if (!permissions.canManageUsers(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only Admins can manage users' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUser = store.getUserById(id);
    if (!targetUser) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = UpdateUserSchema.safeParse(body);
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

    const oldVal = { ...targetUser };
    const updated = store.updateUser(id, {
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    });

    store.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      action: 'UPDATE',
      entity: 'USER',
      entityId: updated.id,
      oldValue: oldVal,
      newValue: { ...updated },
      reason: parsed.data.resetPassword
        ? 'Admin reset password for user'
        : 'Admin updated user status/role',
    });

    return NextResponse.json({
      user: updated,
      message: parsed.data.resetPassword
        ? 'Password reset email notification simulated successfully'
        : 'User updated successfully',
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
