import type { SearchProvider, SearchQuery, SearchResult } from "@/lib/search/types";

/**
 * Placeholder Postgres-backed search provider. There's nothing to search
 * yet (no Opportunity model in Phase 1) - this exists so the interface
 * has one real implementation to validate against, and so later phases
 * add a query, not a whole new abstraction.
 */
export const postgresSearchProvider: SearchProvider = {
  name: "postgres",
  async search<T = unknown>(_query: SearchQuery): Promise<SearchResult<T>[]> {
    return [];
  },
};
