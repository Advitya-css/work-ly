import { CardGridSkeleton } from "@/components/shared/page-skeleton";

/**
 * The fallback for every app page without its own loading screen (Insights,
 * Guide, Career pivot, Redeem...): something appears the moment you click,
 * instead of the old page sitting there until the new one is ready.
 */
export default function Loading() {
  return <CardGridSkeleton count={3} />;
}
