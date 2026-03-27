/**
 * Composition Root — wires infrastructure adapters to domain ports.
 * Single source of truth for dependency injection.
 */

import { SupabaseSiteRepository } from './supabase/SupabaseSiteRepository';
import { SupabaseEmbeddingProvider } from './supabase/SupabaseEmbeddingProvider';
import type { ISiteRepository } from '@/contexts/link-automation/ports/ISiteRepository';
import type { IEmbeddingProvider } from '@/contexts/link-automation/ports/IEmbeddingProvider';

// Singleton instances — swap these for testing or provider migration
let siteRepository: ISiteRepository | null = null;
let embeddingProvider: IEmbeddingProvider | null = null;

export function getSiteRepository(): ISiteRepository {
  if (!siteRepository) siteRepository = new SupabaseSiteRepository();
  return siteRepository;
}

export function getEmbeddingProvider(): IEmbeddingProvider {
  if (!embeddingProvider) embeddingProvider = new SupabaseEmbeddingProvider();
  return embeddingProvider;
}

/** Override for testing */
export function setSiteRepository(repo: ISiteRepository): void {
  siteRepository = repo;
}

export function setEmbeddingProvider(provider: IEmbeddingProvider): void {
  embeddingProvider = provider;
}
