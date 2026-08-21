import { Skeleton } from "@/components/ui/skeleton";

/**
 * What a page shows while its data is being fetched.
 *
 * Before these existed, navigating to a data-heavy screen gave you the old
 * page until the new one was completely ready, so a slow query looked like
 * a click that had not registered. A skeleton in roughly the shape of what
 * is coming makes the wait legible: something is happening, here, in this
 * shape, and the layout will not jump when it lands.
 *
 * All of it is aria-hidden with a polite live message alongside, because a
 * screen reader announcing sixteen grey rectangles is worse than useless.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        Loading
      </span>
      <div aria-hidden className="flex flex-col gap-8">
        {children}
      </div>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="shimmer h-7 w-48" />
      <Skeleton className="shimmer h-4 w-full max-w-lg" />
      <Skeleton className="mt-3 h-8 w-72 rounded-lg" />
    </div>
  );
}

/** A grid of opportunity-shaped cards. */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Shell>
      <HeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <Skeleton className="shimmer size-10 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="shimmer h-4 w-3/4" />
                <Skeleton className="shimmer h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="shimmer h-1.5 w-full rounded-full" />
            <div className="flex gap-2">
              <Skeleton className="shimmer h-5 w-20 rounded-full" />
              <Skeleton className="shimmer h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="shimmer h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

/** A stack of thin rows, for list screens. */
export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Shell>
      <HeaderSkeleton />
      <div className="flex flex-col gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <Skeleton className="shimmer size-8 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="shimmer h-3.5 w-1/3" />
              <Skeleton className="shimmer h-3 w-1/2" />
            </div>
            <Skeleton className="shimmer h-5 w-10 rounded-full" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

/** Stacked panels, for form and settings screens. */
export function PanelsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Shell>
      <HeaderSkeleton />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <Skeleton className="shimmer h-4 w-32" />
          <Skeleton className="shimmer h-3 w-64" />
          <Skeleton className="shimmer h-9 w-full rounded-lg" />
          <Skeleton className="shimmer h-9 w-full rounded-lg" />
        </div>
      ))}
    </Shell>
  );
}
