import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// Cliente do navegador (login, cadastro, OTP, leitura dos próprios dados via RLS).
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
