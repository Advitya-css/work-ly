import { deterministicPriorityProvider } from "@/lib/priority/providers/stub";
import type { PriorityProvider } from "@/lib/priority/types";

export type { PriorityProvider, PriorityResult } from "@/lib/priority/types";

export const priorityProvider: PriorityProvider = deterministicPriorityProvider;
