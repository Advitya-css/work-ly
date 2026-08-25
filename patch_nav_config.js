const fs = require('fs');
let code = fs.readFileSync('src/lib/nav-config.ts', 'utf8');

// Add import
const importTarget = `IconSettings,`;
const importReplacement = `IconSettings,\n  IconGuide,`;
code = code.replace(importTarget, importReplacement);

// Add to secondaryNavItems
const navTarget = `export const secondaryNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: IconSettings, area: "career" },
];`;
const navReplacement = `export const secondaryNavItems: NavItem[] = [
  { label: "Guide", href: "/guide", icon: IconGuide, area: "career" },
  { label: "Settings", href: "/settings", icon: IconSettings, area: "career" },
];`;
code = code.replace(navTarget, navReplacement);

// Add to studentSecondaryNavItems
const studentTarget = `export const studentSecondaryNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: IconSettings, area: "career" },
];`;
const studentReplacement = `export const studentSecondaryNavItems: NavItem[] = [
  { label: "Guide", href: "/guide", icon: IconGuide, area: "career" },
  { label: "Settings", href: "/settings", icon: IconSettings, area: "career" },
];`;
code = code.replace(studentTarget, studentReplacement);

fs.writeFileSync('src/lib/nav-config.ts', code);
