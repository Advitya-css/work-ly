export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { headers } from "next/headers";
import "./globals.css";

/**
 * Two faces, each with one job.
 *
 * Inter carries every piece of interface text - labels, body copy, buttons,
 * table content. It is a neutral grotesque, which is exactly what you want
 * doing invisible work.
 *
 * Instrument Serif appears only at display sizes: page titles and large
 * figures such as a fit score. One weight is enough because it is never
 * asked to be bold - at 40px a regular serif already outweighs everything
 * around it. This split is what gives a page a composed, edited feel rather
 * than the uniform single-sans look of a generated layout.
 *
 * Both are SELF-HOSTED from /public/fonts rather than fetched from Google
 * Fonts. Two reasons, and the second is the important one:
 *
 *   - the build no longer needs network access to succeed;
 *   - no visitor's browser makes a request to Google on page load. For an
 *     app whose settings page explains exactly what leaves the machine,
 *     quietly pinging a third party for a typeface would undercut the claim.
 */
const inter = localFont({
  src: [
    { path: "../../public/fonts/inter-latin-wght-normal.woff2", style: "normal" },
    { path: "../../public/fonts/inter-latin-wght-italic.woff2", style: "italic" },
  ],
  variable: "--font-inter",
  display: "swap",
  // The variable font covers the whole range; naming it here lets the
  // browser synthesise nothing and pick real weights.
  weight: "100 900",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
});

const instrumentSerif = localFont({
  src: [
    { path: "../../public/fonts/instrument-serif-latin-400-normal.woff2", style: "normal" },
    { path: "../../public/fonts/instrument-serif-latin-400-italic.woff2", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
  weight: "400",
  fallback: ["ui-serif", "Georgia", "serif"],
});

export const metadata: Metadata = {
  title: {
    default: "Workly: Know which jobs are actually worth pursuing",
    template: "%s · Workly",
  },
  description:
    "Workly is an AI-powered career intelligence platform: it understands your career profile, discovers relevant opportunities, tells you why they're worth pursuing, and builds a practical pathway to close your gaps.",
  icons: {
    icon: [
      { url: "/workly-app-icon.svg?v=3", type: "image/svg+xml" }
    ]
  }
};

import { ThemeProvider } from "@/components/theme-provider";

export default async function RootLayout({ children }: { children: ReactNode }) {
  // proxy.ts mints a fresh nonce per request and puts it on both the
  // response's CSP header and this request header. Next auto-applies it to
  // every inline script *it* generates, but the hand-written theme-init
  // script below is ours, so it needs the nonce set explicitly or the CSP's
  // script-src (no 'unsafe-inline') blocks it outright.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // suppressHydrationWarning on <html> and <body> only: browser extensions
    // (password managers, grammar checkers, dark-mode toggles) routinely
    // inject attributes like data-extension-installed onto these two
    // elements before React hydrates, which React then reports as a
    // server/client mismatch. It's noise from the user's browser, not a real
    // markup bug, and it's the fix Next.js itself recommends.
    //
    // Scoped deliberately to these two tags - it does NOT cascade to
    // children, so genuine hydration mismatches inside the app are still
    // reported normally.
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement,t=localStorage.getItem('theme'),c=['dark','theme-midnight','theme-lavender','theme-rose','theme-sunset'],m={dark:['dark'],midnight:['dark','theme-midnight'],lavender:['theme-lavender'],rose:['theme-rose'],sunset:['dark','theme-sunset']};c.forEach(function(x){d.classList.remove(x)});if(t&&m[t]){m[t].forEach(function(x){d.classList.add(x)})}else if(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark')}}catch(e){}})()`
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
