import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Briefcase, MapPin, GraduationCap } from "lucide-react";

import { pool } from "@/lib/db/pool";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toArray } from "@/lib/db/array";

export const metadata: Metadata = {
  title: "Career Profile",
  description: "View my professional profile on Work-ly",
  // Reachable by anyone with the link (that's the point of "Share Profile"),
  // but not opted into search-engine indexing - that's a separate decision
  // nobody's made yet, and this is still personal data.
  robots: { index: false, follow: false },
};

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const { rows } = await pool.query(
    `SELECT cp.*, u.name, u."avatarUrl"
     FROM career_profiles cp
     JOIN users u ON cp."userId" = u.id
     WHERE cp.id = $1 AND cp."isPublic" = true`,
    [id]
  );

  const profile = rows[0];
  // Same response whether the id doesn't exist or the owner never made it
  // public - never confirm to a visitor that a given id is a real, private
  // profile.
  if (!profile) notFound();

  const skills = profile.skills ? toArray(profile.skills) : [];
  const initials = (profile.name || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-muted/10 flex flex-col">
      <header className="flex h-14 items-center border-b border-border bg-background/50 backdrop-blur-md px-4 sm:px-6 sticky top-0 z-10">
        <Logo />
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">Public Profile</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 py-12 sm:py-24 relative overflow-hidden">
        
        {/* Decorative background meshes to make it look premium even when empty */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        <Card className="w-full max-w-2xl overflow-hidden border-border/40 shadow-xl bg-background/80 backdrop-blur-xl relative z-10">
          {/* Subtle gradient banner */}
          <div className="h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/30"></div>
          
          <CardContent className="relative px-6 pb-10 pt-0 sm:px-12">
            <div className="flex flex-col items-center -mt-16 mb-6 text-center">
              <Avatar className="size-32 border-4 border-background shadow-lg mb-4 bg-muted">
                {profile.avatarUrl && (
                  <AvatarImage src={profile.avatarUrl} alt={profile.name ?? "User"} referrerPolicy="no-referrer" />
                )}
                <AvatarFallback className="text-4xl font-semibold text-muted-foreground bg-muted">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                {profile.name || "Anonymous Professional"}
              </h1>
              
              {profile.headline && (
                <p className="mt-3 text-lg font-medium text-foreground/80 max-w-md">
                  {profile.headline}
                </p>
              )}
              
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
                {profile.location && (
                  <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full"><MapPin className="size-4" />{profile.location}</span>
                )}
                {profile.currentRole && (
                  <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full"><Briefcase className="size-4" />{profile.currentRole} {profile.currentCompany && `at ${profile.currentCompany}`}</span>
                )}
                {profile.university && (
                  <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full"><GraduationCap className="size-4" />{profile.university}</span>
                )}
              </div>
            </div>

            {/* Content Body - Only renders if data exists */}
            <div className="flex flex-col gap-8 mt-10">
              {profile.summary && (
                <div className="text-center max-w-lg mx-auto">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">About</h2>
                  <div className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {profile.summary}
                  </div>
                </div>
              )}

              {skills.length > 0 && (
                <div className="text-center mt-2">
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                    {skills.map((s) => (
                      <Badge key={s} variant="secondary" className="font-medium text-xs px-2.5 py-1 bg-primary/5 hover:bg-primary/10 text-primary border-primary/10">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(profile.experience || profile.education) && (
                <div className="grid sm:grid-cols-2 gap-10 pt-10 border-t border-border/30 text-left">
                  {profile.experience && (
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                        <Briefcase className="size-4" /> Experience
                      </h2>
                      <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {profile.experience}
                      </div>
                    </div>
                  )}
                  {profile.education && (
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                        <GraduationCap className="size-4" /> Education
                      </h2>
                      <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {profile.education}
                      </div>
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