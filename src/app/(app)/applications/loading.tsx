import { ListSkeleton } from "@/components/shared/page-skeleton";

/**
 * Shown by Next while this route's data resolves, so navigating here
 * gives immediate feedback instead of leaving the previous page on
 * screen until everything is ready.
 */
export default function Loading() {
  return <ListSkeleton />;
}
