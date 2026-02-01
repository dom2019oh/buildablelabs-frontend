// =============================================================================
// Supabase Client (Service Role)
// =============================================================================
// Uses service role key for backend operations - bypasses RLS.
// NEVER expose this client to frontend or AI context.

import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import type { Database } from '../types/database';

export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper to get a user-scoped client (if needed)
export function getUserClient(accessToken: string) {
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
