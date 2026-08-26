import {
  IconAnalyze,
  IconApplication,
  IconDashboard,
  IconDiscover,
  IconDream,
  IconGoal,
  IconOpportunity,
  IconPathway,
  IconProfile,
  IconSettings,
  IconGuide,
  IconStudent,
  type IconProps,
} from "@/components/icons";
import type { CardArea } from "@/components/ui/card";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<IconProps>;
  /** Which area colour this destination belongs to. */
  area: CardArea;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

/**
 * FIVE destinations, not ten.
 *
 * The sidebar used to list every screen in the product, grouped under four
 * headings. That is a directory, not a navigation: you had to already know
 * what Workly called a thing to find it, and the eye had ten equally
 * weighted targets to sort through on every page load.
 *
 * Now the sidebar answers "which part of my job search am I in", and the
 * screens inside each part are reached by the section tabs at the top of
 * the page (see components/shared/section-tabs.tsx). Nothing was removed;
 * Discover, Analyze, Goals, Dream Job and Career Path all still exist and
 * are one click from their section's landing page.
 */
export const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { label: "Home", href: "/dashboard", icon: IconDashboard, area: "career" },
      { label: "Jobs", href: "/opportunities", icon: IconOpportunity, area: "opportunity" },
      { label: "My career", href: "/career-profile", icon: IconProfile, area: "career" },
      { label: "Applications", href: "/applications", icon: IconApplication, area: "application" },
    ],
  },
];

export const primaryNavItems: NavItem[] = navGroups.flatMap((group) => group.items);

export const secondaryNavItems: NavItem[] = [
  { label: "Guide", href: "/guide", icon: IconGuide, area: "career" },
  { label: "Settings", href: "/settings", icon: IconSettings, area: "career" },
];

/**
 * Student mode replaces the navigation above entirely rather than adding to
 * it. Someone looking for a job around a class timetable is doing a
 * different task from someone changing careers, and showing them Career
 * Path and Dream Job alongside campus jobs was most of what made the first
 * attempt at this feel like a filtered list rather than a place.
 */
export const studentNavGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { label: "Student home", href: "/student", icon: IconStudent, area: "opportunity" },
      { label: "Campus jobs", href: "/student/jobs", icon: IconOpportunity, area: "opportunity" },
      { label: "Internships", href: "/student/internships", icon: IconDream, area: "dream" },
      { label: "New Grad", href: "/student/new-grad", icon: IconPathway, area: "pathway" },
      { label: "Applications", href: "/applications", icon: IconApplication, area: "application" },
      { label: "My profile", href: "/career-profile", icon: IconProfile, area: "career" },
    ],
  },
];

export const studentSecondaryNavItems: NavItem[] = [
  { label: "Guide", href: "/guide", icon: IconGuide, area: "career" },
  { label: "Settings", href: "/settings", icon: IconSettings, area: "career" },
];

/**
 * SECTION TABS
 *
 * What used to be sidebar entries. Each set appears at the top of the pages
 * it contains, so the screens stay one click apart without all ten
 * competing for attention in the sidebar.
 */
export interface SectionTab {
  label: string;
  href: string;
  icon: React.ComponentType<IconProps>;
}

export const JOBS_TABS: SectionTab[] = [
  { label: "Opportunities", href: "/opportunities", icon: IconOpportunity },
  { label: "Discover", href: "/discover", icon: IconDiscover },
  { label: "Analyze a job", href: "/analyze-job", icon: IconAnalyze },
];

export const CAREER_TABS: SectionTab[] = [
  { label: "Profile", href: "/career-profile", icon: IconProfile },
  { label: "Goals", href: "/career-goals", icon: IconGoal },
  { label: "Dream job", href: "/dream-job", icon: IconDream },
  { label: "Career path", href: "/career-path", icon: IconPathway },
];

export const STUDENT_TABS: SectionTab[] = [
  { label: "Overview", href: "/student", icon: IconStudent },
  { label: "Campus jobs", href: "/student/jobs", icon: IconOpportunity },
  { label: "Internships", href: "/student/internships", icon: IconDream },
  { label: "New Grad", href: "/student/new-grad", icon: IconPathway },
];
