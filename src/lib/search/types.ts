/**
 * Search abstraction. Backed by plain PostgreSQL to start (full-text
 * search / trigram matching on the Opportunity table, once that model
 * exists); the interface is written so a dedicated engine (pgvector for
 * semantic search, or OpenSearch/Elasticsearch) can be swapped in later
 * without changing call sites.
 */
export interface SearchQuery {
  text: string;
  limit?: number;
}

export interface SearchResult<T = unknown> {
  id: string;
  score: number;
  item: T;
}

export interface SearchProvider {
  readonly name: string;
  search<T = unknown>(query: SearchQuery): Promise<SearchResult<T>[]>;
}
