import { pool } from "@/lib/db/pool";
import type { SearchProvider, SearchQuery, SearchResult } from "@/lib/search/types";

/**
 * Postgres-backed search provider implementing basic ILIKE text search
 * across opportunity titles and companies.
 */
export const postgresSearchProvider: SearchProvider = {
  name: "postgres",
  async search<T = unknown>(query: SearchQuery): Promise<SearchResult<T>[]> {
    if (!query.text?.trim()) return [];
    
    const searchTerm = `%${query.text.trim()}%`;
    const { rows } = await pool.query(
      `SELECT id, title, company, location, created_at
       FROM opportunities 
       WHERE title ILIKE $1 OR company ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [searchTerm, query.limit || 50]
    );

    return rows.map((row) => ({
      id: row.id,
      score: 1, // Basic ILIKE doesn't give relevance scoring without pg_trgm
      item: {
        id: row.id,
        title: row.title,
        company: row.company,
        location: row.location,
      } as unknown as T,
    }));
  },
};
