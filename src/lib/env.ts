import { RuntimeError } from './error-schema';

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

  const missing: string[] = [];
  if (!env.VITE_SUPABASE_URL && !env.VITE_SUPABASE_PROJECT_ID) {
    missing.push("VITE_SUPABASE_URL");
  }
  if (!env.VITE_SUPABASE_PUBLISHABLE_KEY && !env.VITE_SUPABASE_ANON_KEY) {
    missing.push("VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)");
  }

  if (missing.length > 0) {
    throw new RuntimeError({
      code: "ENV_MISCONFIGURATION",
      missing,
      mode: import.meta.env.MODE,
      timestamp: Date.now(),
      probable_cause: "Environment variables missing at boot time",
      recovery: "Set required Supabase env vars before bootstrap",
      fatal: true
    });
  }

  return env;
};

export const getSupabaseUrl = (): string => {
  const env = getRuntimeEnv();
  if (env.VITE_SUPABASE_URL) return env.VITE_SUPABASE_URL;
  if (env.VITE_SUPABASE_PROJECT_ID) {
    return `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
  }
  throw new RuntimeError({
      code: "ENV_MISCONFIGURATION",
      missing: ["VITE_SUPABASE_URL", "VITE_SUPABASE_PROJECT_ID"],
      recovery: "Set required Supabase env vars before bootstrap",
      fatal: true
  });
};

export const getSupabasePublishableKey = (): string | undefined => {
  const env = getRuntimeEnv();
  return env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
};

