"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Joyride, STATUS, EVENTS, ACTIONS, type EventData, type Step } from "react-joyride";

interface TourContextType {
  startTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) throw new Error("useTour must be used within TourProvider");
  return context;
}

const TOUR_STORAGE_KEY = "workly_has_seen_tour";

/**
 * Five stops, all on the sidebar, none of them needing a page change.
 *
 * The first attempt at this tour tried to walk into the Discover page
 * mid-tour to point at controls there, which meant driving `router.push`
 * and guessing at a timeout for the next page to be ready. It also pointed
 * at ".tour-dream-job" and ".tour-discover" - sidebar entries that don't
 * exist any more now that the sidebar is four destinations, not ten (see
 * nav-config.ts). Joyride couldn't find them, so the tour stalled the
 * moment it got there.
 *
 * This version only ever points at the sidebar, which is present and
 * identical on every signed-in page, so there is nothing to navigate to and
 * nothing that can go missing. The className on each target
 * (`tour-{route}`) is generated automatically in sidebar-nav.tsx from
 * nav-config.ts, so a future rename of a route relabels itself here too.
 */
const steps: Step[] = [
  {
    target: "body",
    placement: "center",
    content: (
      <div className="flex flex-col gap-1.5 text-left">
        <p className="text-base font-semibold tracking-tight text-foreground">Welcome to Work-ly</p>
        <p>A minute-long look at where everything lives. Skip this any time, or come back to it later from the Guide.</p>
      </div>
    ),
  },
  {
    target: ".tour-dashboard",
    placement: "right",
    content:
      "Home is your dashboard: today's top-priority jobs, your profile completeness, and how your pathway is progressing.",
  },
  {
    target: ".tour-career-profile",
    placement: "right",
    content:
      "My career holds your profile, your goals, and your dream-job analysis. Everything Work-ly recommends is checked against what's here.",
  },
  {
    target: ".tour-opportunities",
    placement: "right",
    content:
      "Jobs is where you discover new roles and keep track of everything you've looked at, each one scored against your profile with a plain-language reason why.",
  },
  {
    target: ".tour-applications",
    placement: "right",
    content:
      "Applications is your tracker. Log what you've applied to and move it across stages as things progress - the AI tools for tailoring a resume, prepping for an interview, and negotiating an offer all live inside here.",
  },
  {
    target: ".tour-guide",
    placement: "right",
    content: "Guide has a full walkthrough of every screen and every button, whenever you want the details.",
  },
  {
    target: "body",
    placement: "center",
    content: (
      <div className="flex flex-col gap-1.5 text-left">
        <p className="text-base font-semibold tracking-tight text-foreground">That's the shape of it</p>
        <p>Everything else is in the Guide whenever you want it. Go ahead and get started.</p>
      </div>
    ),
  },
];

/** Matches the `md:` breakpoint the sidebar itself uses (desktop-sidebar.tsx).
 * Below it, the sidebar isn't rendered - navigation lives in a closed sheet
 * instead - so every target above would fail to find anything real. Rather
 * than fake a docked sidebar for the tour alone, it simply doesn't run on
 * small screens yet. */
function isDesktopViewport() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const hasSeenTour = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!hasSeenTour && isDesktopViewport()) {
      setRun(true);
    }
  }, []);

  const handleJoyrideCallback = (data: EventData) => {
    const { status, type, action, index } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };

  const startTour = () => {
    if (!isDesktopViewport()) return;
    setStepIndex(0);
    setRun(true);
  };

  if (!isMounted) return <>{children}</>;

  return (
    <TourContext.Provider value={{ startTour }}>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        onEvent={handleJoyrideCallback}
        locale={{ last: "Done" }}
        options={{
          // Pulled from the app's own design tokens (globals.css) rather
          // than fixed hex values, so the tour matches whichever of the
          // five themes - including dark - the person has actually chosen,
          // instead of only ever matching the default light plum theme.
          primaryColor: "var(--primary)",
          textColor: "var(--popover-foreground)",
          backgroundColor: "var(--popover)",
          arrowColor: "var(--popover)",
          // A dimming scrim, not a themed one: it always darkens the rest
          // of the page regardless of light/dark mode. Lighter than the
          // first attempt's 0.6 so the app underneath still reads as calm
          // rather than gone.
          overlayColor: "rgba(20, 16, 15, 0.45)",
          zIndex: 1000,
          showProgress: true,
          buttons: ["skip", "back", "primary"],
        }}
        styles={{
          tooltip: {
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            fontFamily: "inherit",
            boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.25)",
          },
          buttonPrimary: {
            borderRadius: "calc(var(--radius) - 4px)",
            fontWeight: 600,
          },
          buttonBack: {
            marginRight: "8px",
            color: "var(--muted-foreground)",
          },
          buttonSkip: {
            color: "var(--muted-foreground)",
          },
        }}
      />
      {children}
    </TourContext.Provider>
  );
}
