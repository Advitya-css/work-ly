/**
 * Drawn scenes for empty states.
 *
 * An empty screen is the first thing a new user sees on most of these
 * pages, and until now it was one small outline icon in a grey circle above
 * two lines of text. That reads as an error, or as something broken,
 * because nothing about it looks intentional.
 *
 * These are small line drawings instead: still restrained, still built from
 * the same 1.6-weight geometry as the icon set, but with enough going on to
 * read as a designed state rather than a missing one. They take the accent
 * colour from whatever context they sit in, and they are decorative, so
 * they are hidden from assistive technology entirely: the heading and
 * description beside them carry the actual meaning.
 */

interface Props {
  className?: string;
}

const shared = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Empty list: a few cards, the front one blank. */
export function IllustrationNoResults({ className }: Props) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden focusable="false">
      <g {...shared} opacity="0.35">
        <rect x="26" y="12" width="68" height="18" rx="5" />
        <rect x="20" y="34" width="80" height="18" rx="5" />
      </g>
      <g {...shared}>
        <rect x="14" y="56" width="92" height="24" rx="6" />
        <line x1="26" y1="65" x2="58" y2="65" opacity="0.5" />
        <line x1="26" y1="72" x2="44" y2="72" opacity="0.3" />
        <circle cx="92" cy="68" r="5" opacity="0.5" />
      </g>
    </svg>
  );
}

/** Nothing discovered yet: a sweep looking outward. */
export function IllustrationSearching({ className }: Props) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden focusable="false">
      <g {...shared}>
        <circle cx="52" cy="42" r="24" />
        <circle cx="52" cy="42" r="12" opacity="0.5" />
        <circle cx="52" cy="42" r="2.4" fill="currentColor" stroke="none" />
        <line x1="70" y1="60" x2="88" y2="76" />
      </g>
      <g {...shared} opacity="0.3">
        <line x1="52" y1="8" x2="52" y2="14" />
        <line x1="18" y1="42" x2="24" y2="42" />
        <line x1="28" y1="18" x2="32" y2="22" />
        <line x1="76" y1="18" x2="72" y2="22" />
      </g>
    </svg>
  );
}

/** No profile yet: a person outline with a document beside them. */
export function IllustrationProfile({ className }: Props) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden focusable="false">
      <g {...shared}>
        <circle cx="40" cy="30" r="13" />
        <path d="M18 74a22 22 0 0 1 44 0" />
      </g>
      <g {...shared} opacity="0.45">
        <rect x="70" y="20" width="34" height="46" rx="5" />
        <line x1="78" y1="32" x2="96" y2="32" />
        <line x1="78" y1="41" x2="96" y2="41" />
        <line x1="78" y1="50" x2="89" y2="50" />
      </g>
    </svg>
  );
}

/** No pathway yet: steps rising toward a flag. */
export function IllustrationPathway({ className }: Props) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden focusable="false">
      <g {...shared}>
        <circle cx="20" cy="70" r="6" />
        <circle cx="52" cy="50" r="6" opacity="0.6" />
        <circle cx="84" cy="30" r="6" opacity="0.6" />
        <path d="M25 66l22-13M57 46l22-13" opacity="0.4" strokeDasharray="3 4" />
        <path d="M100 30V12" />
        <path d="M100 13l14 5-14 5z" fill="currentColor" opacity="0.25" />
      </g>
    </svg>
  );
}

/** Nothing sent yet: an envelope mid-flight. */
export function IllustrationApplications({ className }: Props) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden focusable="false">
      <g {...shared}>
        <rect x="34" y="26" width="56" height="40" rx="5" />
        <path d="M34 32l28 20 28-20" />
      </g>
      <g {...shared} opacity="0.3">
        <line x1="10" y1="36" x2="24" y2="36" />
        <line x1="16" y1="46" x2="26" y2="46" />
        <line x1="10" y1="56" x2="24" y2="56" />
      </g>
    </svg>
  );
}

/** Student with nothing yet: a mortarboard over an open book. */
export function IllustrationStudent({ className }: Props) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden focusable="false">
      <g {...shared}>
        <path d="M60 16l30 14-30 14-30-14z" />
        <path d="M42 36v12c0 5 8 9 18 9s18-4 18-9V36" opacity="0.55" />
      </g>
      <g {...shared} opacity="0.35">
        <path d="M28 64h26a6 6 0 0 1 6 6 6 6 0 0 1 6-6h26" />
        <path d="M28 64v12h26a6 6 0 0 1 6 6V70M92 64v12H66a6 6 0 0 0-6 6" />
      </g>
    </svg>
  );
}
