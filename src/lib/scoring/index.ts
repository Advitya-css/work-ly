import { deterministicScoringProvider } from "@/lib/scoring/providers/stub";
import type { ScoringProvider } from "@/lib/scoring/types";

export type { ScoringProvider, JobFitAnalysis } from "@/lib/scoring/types";

export const scoringProvider: ScoringProvider = deterministicScoringProvider;
