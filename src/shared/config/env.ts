/**
 * Runtime environment validation using Zod.
 * Catches misconfiguration at startup instead of at first API call.
 */

import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY is required'),
  VITE_SUPABASE_PROJECT_ID: z.string().min(1, 'VITE_SUPABASE_PROJECT_ID is required'),
});

export type AppEnv = z.infer<typeof envSchema>;

let _env: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (_env) return _env;

  const result = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  });

  if (!result.success) {
    const issues = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error(`[ENV] Invalid environment configuration:\n${issues}`);
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  _env = result.data;
  return _env;
}
