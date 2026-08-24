import type { SVGProps } from "react";

/**
 * Workly's own icons.
 *
 * Drawn here rather than pulled from an icon library, for two reasons. The
 * first is that a stock outline set is instantly recognisable as a stock
 * outline set, and it was a large part of why the app looked like a template.
 * The second is that this file replaces the emoji that used to mark the
 * discovery buckets: an emoji renders differently on every operating system,
 * cannot take a colour, and is read aloud by screen readers as whatever
 * Unicode decided to call it.
 *
 * House rules, so they look like one family:
 *   - 24x24 box, 1.6 stroke, round caps and joins
 *   - geometric, built from circles and straight lines
 *   - each carries one idea, never two
 *   - `currentColor` throughout, so an icon takes its area's colour for free
 */

export type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ nav -- */

/** Dashboard: four panes, one highlighted. */
export function IconDashboard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="4.5" rx="2" />
      <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
    </Svg>
  );
}

/** Discover: a sweep, looking outward for things you have not seen. */
export function IconDiscover(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Opportunities: a stack of openings, the top one lifted. */
export function IconOpportunity(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="7" width="18" height="12.5" rx="2.5" />
      <path d="M8.5 7V5.6A2.1 2.1 0 0 1 10.6 3.5h2.8A2.1 2.1 0 0 1 15.5 5.6V7" />
      <path d="M3 12.5h18" />
      <path d="M10.5 12.5v1.6h3v-1.6" />
    </Svg>
  );
}

/** Career profile: a person, with the shoulders left open. */
export function IconProfile(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

/** Career goals: concentric rings with the mark off-centre, not a bullseye. */
export function IconGoal(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 12l6.5-6.5" />
      <path d="M15.5 3.5l3 1 1 3" />
    </Svg>
  );
}

/** Analyze a job: a document read closely. */
export function IconAnalyze(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
      <path d="M14 3l5 5v3" />
      <path d="M14 3v5h5" />
      <circle cx="16.5" cy="16.5" r="3.5" />
      <path d="M19.2 19.2L21.5 21.5" />
    </Svg>
  );
}

/** Dream job: a single star, drawn as a four-point spark rather than a badge. */
export function IconDream(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5Z" />
      <path d="M18 16.5c.3 1.8 1 2.5 2.8 2.8-1.8.3-2.5 1-2.8 2.8-.3-1.8-1-2.5-2.8-2.8 1.8-.3 2.5-1 2.8-2.8Z" />
    </Svg>
  );
}

/** Career path: steps rising, connected. */
export function IconPathway(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5" cy="18.5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="5.5" r="2" />
      <path d="M6.4 17.1l4.2-3.7M13.4 10.6l4.2-3.7" />
    </Svg>
  );
}

/** Applications: something sent. */
export function IconApplication(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 4.5L10.5 15" />
      <path d="M21 4.5l-6.8 16.2-3.7-6.7-6.7-3.7L21 4.5Z" />
    </Svg>
  );
}

/** Students: a mortarboard, brim and tassel. */
export function IconStudent(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5L21 9.5L12 14L3 9.5Z" />
      <path d="M7 11.2v3.3c0 1.5 2.2 2.7 5 2.7s5-1.2 5-2.7v-3.3" />
      <path d="M21 9.5v5" />
      <circle cx="21" cy="16.3" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Settings: a dial, not a many-toothed cog. */
export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2" />
    </Svg>
  );
}

/* ------------------------------------------------- discovery buckets ----- */
/*
 * These four replace the emoji that used to label the buckets. Each says
 * something about urgency through its own shape, so the meaning survives
 * without colour.
 */

/** Apply Now: an upward arrow, the strongest signal in the set. */
export function IconApplyNow(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16.5V8" />
      <path d="M8.5 11.5L12 8l3.5 3.5" />
    </Svg>
  );
}

/** Strong: a confirmed match. */
export function IconStrong(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.7 2.7L16 9.7" />
    </Svg>
  );
}

/** Stretch: reachable, but upward and further away. */
export function IconStretch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14.5l3-3 2.2 2.2L16.5 10" />
      <path d="M16.5 12.6V10h-2.6" />
    </Svg>
  );
}

/** Low priority: present, but resting. */
export function IconLowPriority(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </Svg>
  );
}

/* ------------------------------------------------------------ support --- */

/** The chat launcher. A speech mark with a question inside it. */
export function IconAsk(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 12.2c0 4.2-3.8 7.6-8.5 7.6a9.7 9.7 0 0 1-2.7-.4L4 21l1.4-3.9a7.2 7.2 0 0 1-2-4.9C3.5 8 7.3 4.6 12 4.6s8.5 3.4 8.5 7.6Z" />
      <path d="M10.3 10.2a1.8 1.8 0 0 1 3.5.6c0 1.2-1.8 1.5-1.8 2.6" />
      <path d="M12 16.1h.01" />
    </Svg>
  );
}

/** Something worth reading, used in tips and callouts. */
export function IconInsight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.2 17.5h5.6" />
      <path d="M10 20.5h4" />
      <path d="M12 3.5a6 6 0 0 0-3.4 10.9c.5.4.8 1 .8 1.6h5.2c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3.5Z" />
    </Svg>
  );
}

/** Nothing here yet. Used by empty states instead of a grey square. */
export function IconEmpty(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 12.5h4l1.5 3h6l1.5-3h4" strokeDasharray="0 0" />
      <path d="M5.6 6.2L3.5 12.5v5a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5l-2.1-6.3a2 2 0 0 0-1.9-1.4H7.5a2 2 0 0 0-1.9 1.4Z" />
    </Svg>
  );
}

export function IconGuide(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </Svg>
  );
}
