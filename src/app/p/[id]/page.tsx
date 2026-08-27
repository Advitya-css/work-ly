import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Mail, Briefcase, MapPin, GraduationCap } from "lucide-react";

import { pool } from "@/lib/db/pool";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toArray } from "@/lib/db/array";

export const metadata: Metadata = {
  title: "Career Profile",
  description: "View my professional profile on Workly",
};

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // We use pool directly here because we only need the public fields and don't require auth.
  const { rows } = await pool.query(
    `SELECT cp.*, u.name, u."avatarUrl" 
     FROM "CareerProfile" cp 
     JOIN "User" u ON cp."userId" = u.id 
     WHERE cp.id = $1`,
    [id]
  );

  const profile = rows[0];
  if (!profile) notFound();

  const skills = profile.skills ? toArray(profile.skills) : [];

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="flex h-14 items-center border-b border-border bg-background px-4 sm:px-6">
        <Logo />
        <span className="ml-auto text-xs font-medium text-muted-foreground">Public Profile</span>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <div className="h-32 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
          <CardContent className="relative px-6 pb-8 pt-0 sm:px-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-16 mb-8">
              <div className="size-24 sm:size-32 rounded-xl border-4 border-background bg-muted overflow-hidden shadow-sm flex items-center justify-center shrink-0">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name ?? "User"} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-4xl font-semibold text-muted-foreground">
                    {(profile.name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {profile.name || "Anonymous Professional"}
                </h1>
                {profile.headline && (
                  <p className="mt-2 text-lg text-foreground/80">{profile.headline}</p>
                )}
                
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  {profile.location && (
                    <span className="flex items-center gap-1.5"><MapPin className="size-4" />{profile.location}</span>
                  )}
                  {profile.currentRole && (
                    <span className="flex items-center gap-1.5"><Briefcase className="size-4" />{profile.currentRole} at {profile.currentCompany || "Various"}</span>
                  )}
                  {profile.university && (
                    <span className="flex items-center gap-1.5"><GraduationCap className="size-4" />{profile.university}</span>
                  )}
                </div>
              </div>

              {profile.summary && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">About</h2>
                  <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {profile.summary}
                  </div>
                </div>
              )}

              {skills.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-3">Skills & Expertise</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s: string) => (
                      <Badge key={s} variant="secondary" className="font-normal text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {(profile.experience || profile.education) && (
                <div className="grid sm:grid-cols-2 gap-8 pt-6 border-t border-border/50">
                  {profile.experience && (
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><Briefcase className="size-4" /> Experience</h2>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{profile.experience}</div>
                    </div>
                  )}
                  {profile.education && (
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><GraduationCap className="size-4" /> Education</h2>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{profile.education}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
