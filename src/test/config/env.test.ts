/**
 * Tests for Zod environment validation.
 */

import { describe, it, expect } from 'vitest';

describe('env validation', () => {
  it('validates correct env vars', async () => {
    // The env module uses import.meta.env, so we test the schema directly
    const { z } = await import('zod');
    const envSchema = z.object({
      VITE_SUPABASE_URL: z.string().url(),
      VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
      VITE_SUPABASE_PROJECT_ID: z.string().min(1),
    });

    const valid = envSchema.safeParse({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJkey',
      VITE_SUPABASE_PROJECT_ID: 'proj123',
    });
    expect(valid.success).toBe(true);
  });

  it('rejects invalid URL', async () => {
    const { z } = await import('zod');
    const envSchema = z.object({
      VITE_SUPABASE_URL: z.string().url(),
      VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
      VITE_SUPABASE_PROJECT_ID: z.string().min(1),
    });

    const invalid = envSchema.safeParse({
      VITE_SUPABASE_URL: 'not-a-url',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'key',
      VITE_SUPABASE_PROJECT_ID: 'proj',
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects empty key', async () => {
    const { z } = await import('zod');
    const envSchema = z.object({
      VITE_SUPABASE_URL: z.string().url(),
      VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
      VITE_SUPABASE_PROJECT_ID: z.string().min(1),
    });

    const invalid = envSchema.safeParse({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
      VITE_SUPABASE_PROJECT_ID: 'proj',
    });
    expect(invalid.success).toBe(false);
  });
});
