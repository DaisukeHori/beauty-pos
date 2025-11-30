import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

let supabaseClient: SupabaseClient<Database> | null = null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function initializeSupabase(config: SupabaseConfig): SupabaseClient<Database> {
  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseClient;
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initializeSupabase first.');
  }
  return supabaseClient;
}

export function resetSupabaseClient(): void {
  supabaseClient = null;
}

export type { SupabaseClient };
