import { postgresSearchProvider } from "@/lib/search/providers/postgres";
import type { SearchProvider } from "@/lib/search/types";

export type { SearchProvider, SearchQuery, SearchResult } from "@/lib/search/types";

export const searchProvider: SearchProvider = postgresSearchProvider;
