import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  const user = store.getCurrentUser();
  const allUsers = store.getUsers();
  return NextResponse.json({
    user,
    availableUsers: allUsers,
  });
}
