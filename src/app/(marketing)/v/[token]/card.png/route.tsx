import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { SHARE_COPY, type ShareState } from "@/lib/share/verdict-core";
import { verifyVerdict } from "@/lib/share/verdict-token";

/**
 * The picture for a shared verdict: what shows in a LinkedIn, WhatsApp or X
 * preview, and what "Save image" downloads for an Instagram story. The same
 * signed token as the page, so it can only show a verdict Work-ly gave.
 */

const INK = "#1c1a19";
const MUTED = "#6b6560";
const PLUM = "#7a2e55";
const TONE = { good: "#116149", warn: "#8a5300", bad: "#b3261e" } as const;
// Drawn, not typed: the card's font has no tick or cross glyphs.
const STATE: Record<ShareState, { path: string; color: string }> = {
  met: { path: "M7 12.5l3.2 3.2L17 9", color: TONE.good },
  partial: { path: "M7.5 12h9", color: TONE.warn },
  missing: { path: "M8.5 8.5l7 7M15.5 8.5l-7 7", color: TONE.bad },
};

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/og/inter-500.woff")),
  readFile(join(process.cwd(), "assets/og/inter-800.woff")),
  readFile(join(process.cwd(), "public/workly-bot-face.png"), "base64"),
]);

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const v = verifyVerdict(token);
  if (!v) return new Response("Not found", { status: 404 });
  const [regular, heavy, robot] = await fonts;
  const copy = SHARE_COPY[v.r];
  const tone = TONE[copy.tone];
  const ringC = 2 * Math.PI * 70;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#fffdfb",
          backgroundImage: "radial-gradient(ellipse 70% 60% at 85% 0%, #f6e3ec, rgba(255,253,251,0))",
          fontFamily: "Inter",
          color: INK,
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 800, color: PLUM, letterSpacing: 2 }}>WORK-LY CHECKED THIS JOB</div>
          {v.t && (
            <div style={{ display: "flex", marginTop: 18, fontSize: 38, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15 }}>{v.t}</div>
          )}
          {v.c && <div style={{ display: "flex", marginTop: 6, fontSize: 26, color: MUTED }}>{v.c}</div>}
          <div style={{ display: "flex", marginTop: v.t ? 22 : 28, fontSize: 92, fontWeight: 800, letterSpacing: -4, color: tone, lineHeight: 1 }}>
            {copy.word}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 26, gap: 12 }}>
            {v.q.map((row) => (
              <div key={row.x} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    display: "flex",
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    background: STATE[row.k].color,
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path d={STATE[row.k].path} fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ display: "flex", fontSize: 25, lineHeight: 1.2, maxWidth: 700 }}>{row.x}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: MUTED }}>
            <span style={{ color: PLUM, fontWeight: 800 }}>work-ly.in</span>
            <span style={{ marginLeft: 12 }}>· Is it worth applying? Free check, no signup</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", width: 230, marginLeft: 24 }}>
          {v.s != null ? (
            <div style={{ display: "flex", position: "relative", width: 170, height: 170, alignItems: "center", justifyContent: "center" }}>
              <svg width="170" height="170" viewBox="0 0 170 170" style={{ position: "absolute", top: 0, left: 0 }}>
                <circle cx="85" cy="85" r="70" fill="none" stroke="#efe7ea" strokeWidth="14" />
                <circle
                  cx="85"
                  cy="85"
                  r="70"
                  fill="none"
                  stroke={tone}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(ringC * v.s) / 100} ${ringC}`}
                  transform="rotate(-90 85 85)"
                />
              </svg>
              <div style={{ display: "flex", fontSize: 58, fontWeight: 800, letterSpacing: -2 }}>{v.s}</div>
            </div>
          ) : (
            <div style={{ display: "flex", height: 170 }} />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={`data:image/png;base64,${robot}`} width={190} height={190} style={{ objectFit: "contain" }} />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: regular, weight: 500, style: "normal" },
        { name: "Inter", data: heavy, weight: 800, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=86400, immutable" },
    },
  );
}
