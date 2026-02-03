// =============================================================================
// Supabase Client (Service Role)
// =============================================================================
// Uses service role key for backend operations - bypasses RLS.
// NEVER expose this client to frontend or AI context.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Type for the database (can be expanded with generated types)
// deno-lint-ignore no-explicit-any
type Database = any;

// Service role client - bypasses RLS for backend operations
export const supabase: SupabaseClient<Database> = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper to get a user-scoped client (inherits user's RLS policies)
export function getUserClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

// Helper to verify and get user from token
export async function verifyUserToken(token: string): Promise<{ userId: string; email: string } | null> {
  const { data: claimsData, error } = await supabase.auth.getClaims(token);
  
  if (error || !claimsData?.claims) {
    return null;
  }
  
  return {
    userId: claimsData.claims.sub as string,
    email: (claimsData.claims.email as string) || '',
  };
}
