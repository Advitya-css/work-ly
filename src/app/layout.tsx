export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on input focus which ruins mobile fluidity
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffdfb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { THEME_SCRIPT } from "@/lib/theme-script";
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
    default: "Work-ly — AI career coach for your resume, interviews and next role",
    template: "%s · Work-ly",
  },
  description:
    "Work-ly is AI career software for individuals: tailor your resume and cover letter to each role, see your honest fit, practise with mock interviews, and follow a plan to reach the role you want.",
  metadataBase: new URL("https://work-ly.in"),
  alternates: {
    canonical: "/",
  }
};

import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }: { children: ReactNode }) {
  // No per-request nonce here on purpose: reading request headers in the
  // root layout made every page dynamic, so nothing could be cached. The
  // theme script below is allowed by its hash instead (lib/theme-script.ts).
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
          dangerouslySetInnerHTML={{
            __html: THEME_SCRIPT
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
