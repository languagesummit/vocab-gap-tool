export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Creating a Supabase client with blank credentials throws, which would take
// down every route including static ones. Callers check this first so a
// missing environment variable shows a setup message instead of a 500.
export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
