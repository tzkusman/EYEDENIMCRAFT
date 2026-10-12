import { NextResponse } from 'next/server';
import { testSupabaseConnection, isSupabaseConfigured, SUPABASE_COMPLETE_SQL } from '@/lib/supabase';

export async function GET() {
  const result = await testSupabaseConnection();
  return NextResponse.json({
    ...result,
    isConfigured: isSupabaseConfigured(),
    sqlScript: SUPABASE_COMPLETE_SQL,
    guide: {
      steps: [
        '1. In Supabase Dashboard, go to your Project Settings -> API to copy Project URL & Service Role Key.',
        '2. In Supabase Dashboard, go to Project Settings -> Database to copy Connection String (URI) for DATABASE_URL.',
        '3. Add DATABASE_URL, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY to your environment.',
        '4. In Supabase Dashboard, open SQL Editor, paste the SQL script provided, and click Run.',
        '5. Return here and click "Test Connection" to confirm all 5 tables and the immutability trigger are active.',
      ],
    },
  });
}
