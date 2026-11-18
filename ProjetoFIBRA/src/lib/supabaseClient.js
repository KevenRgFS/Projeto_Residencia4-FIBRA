import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const chaveAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !chaveAnon) {
  throw new Error(
    "Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local"
  );
}

export const supabase = createClient(url, chaveAnon);