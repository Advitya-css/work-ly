import type { StageChange } from "./stage-moments";

/**
 * A stage change is announced as a window event rather than threaded
 * through props, because it can come from three unrelated places (the
 * status picker on an application, the Kanban board, the "Mark as applied"
 * button on a job) and the pop-up lives once, in the app layout. See
 * components/guidance/stage-moment-host.tsx.
 */
export const STAGE_CHANGE_EVENT = "workly:stage-change";

export function announceStageChange(change: StageChange): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<StageChange>(STAGE_CHANGE_EVENT, { detail: change }));
}
