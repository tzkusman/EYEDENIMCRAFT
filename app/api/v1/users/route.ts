import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';

const CreateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['ADMIN', 'MANAGER', 'MERCHANDISER']),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const user = store.getCurrentUser();
    if (!permissions.canManageUsers(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only Admins can manage users' } },
        { status: 403 }
      );
    }

    const users = store.getUsers();
    return NextResponse.json({ users });
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
    if (!permissions.canManageUsers(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only Admins can create users' } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);
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

    const newUser = store.addUser(parsed.data);

    store.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      action: 'CREATE',
      entity: 'USER',
      entityId: newUser.id,
      oldValue: null,
      newValue: { fullName: newUser.fullName, email: newUser.email, role: newUser.role },
      reason: 'Admin created new user profile',
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
