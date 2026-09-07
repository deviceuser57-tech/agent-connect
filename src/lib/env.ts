
type RuntimeEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

export const getRuntimeEnv = (): RuntimeEnv => {
  const importEnv = (import.meta.env || {}) as RuntimeEnv;

  const env: RuntimeEnv = {
    VITE_SUPABASE_URL: importEnv.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: importEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: importEnv.VITE_SUPABASE_PROJECT_ID,
    VITE_SUPABASE_ANON_KEY: importEnv.VITE_SUPABASE_ANON_KEY,
  };

  return env;
};

const FALLBACK_URL = "https://hexofmnsxxwkriznwmfq.supabase.co";

export const getSupabaseUrl = (): string => {
  const env = getRuntimeEnv();
  if (env.VITE_SUPABASE_URL) return env.VITE_SUPABASE_URL;
  if (env.VITE_SUPABASE_PROJECT_ID) {
    return `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
  }
  return FALLBACK_URL;
};

export const getSupabasePublishableKey = (): string | undefined => {
  const env = getRuntimeEnv();
  return env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
};

