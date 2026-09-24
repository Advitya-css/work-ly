import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFullPathwayById } from "@/lib/pathway/get-full-pathway";
import { getUserById } from "@/lib/db/users";
import { pool } from "@/lib/db/pool";
import { MapPin, Flag, ArrowRight, Sparkles, Compass, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTION_WINDOW_LABEL, ACTION_WINDOW_ORDER } from "@/lib/pathway/labels";

interface PageProps {
  params: { id: string };
}

/**
 * A pathway is only public if its owner opted in to sharing (the same
 * revocable career_profiles."isPublic" switch the Share button sets).
 * Without this, anyone holding a pathway id could read someone's plan.
 */
async function isSharedByOwner(userId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM career_profiles WHERE "userId" = $1 AND "isPublic" = true LIMIT 1`,
    [userId],
  );
  return rows.length > 0;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pathway = await getFullPathwayById(params.id).catch(() => null);
  if (!pathway || !(await isSharedByOwner(pathway.userId))) return { title: "Pathway not found" };
  const user = await getUserById(pathway.userId);
  const name = user?.name ? user.name.split(" ")[0] : "Someone";
  return {
    title: `${name}'s 30-Day Pathway to ${pathway.targetStateLabel} | Work-ly`,
    description: `A personalized AI career transition plan from ${pathway.currentStateLabel} to ${pathway.targetStateLabel}.`,
  };
}

export default async function PublicPathwayPage({ params }: PageProps) {
  const pathway = await getFullPathwayById(params.id).catch(() => null);
  if (!pathway || !(await isSharedByOwner(pathway.userId))) notFound();
  const user = await getUserById(pathway.userId);
  const firstName = user?.name ? user.name.split(" ")[0] : "A Work-ly User";

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-primary/30 pb-32">
      {/* Abstract background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-rose-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-16 md:pt-24">
        {/* Header section */}
        <div className="mb-16">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-zinc-100 transition-colors mb-12">
            <Compass className="size-5 text-primary" />
            Work-ly
          </Link>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500 mb-6 leading-tight">
            {firstName}&apos;s Action Plan
          </h1>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-lg md:text-xl font-medium text-zinc-300 bg-white/5 p-4 md:p-6 rounded-2xl border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
                <MapPin className="size-5 text-zinc-400" />
              </div>
              <span className="line-clamp-1">{pathway.currentStateLabel}</span>
            </div>
            <ArrowRight className="hidden sm:block size-5 text-zinc-500 shrink-0" />
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                <Flag className="size-5 text-primary" />
              </div>
              <span className="line-clamp-1 text-white">{pathway.targetStateLabel}</span>
            </div>
          </div>
        </div>

        {/* Steps Timeline */}
        <div className="space-y-12">
          {pathway.steps.map((step, index) => {
            const stepActions = pathway.actions.filter(a => a.stepId === step.id);
            return (
              <div key={step.id} className="relative group">
                <div className="absolute -inset-y-6 -inset-x-6 bg-white/5 opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-500" />
                <div className="relative flex gap-6">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-zinc-900 border-2 border-zinc-800 text-zinc-500 font-bold tabular-nums">
                      {index + 1}
                    </div>
                    {index !== pathway.steps.length - 1 && (
                      <div className="w-0.5 h-full bg-gradient-to-b from-zinc-800 to-transparent mt-4 mb-2" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
                    <p className="text-zinc-400 text-lg leading-relaxed mb-6">{step.description}</p>
                    
                    {stepActions.length > 0 && (
                      <div className="grid gap-3">
                        {stepActions.map(action => (
                          <div key={action.id} className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                            <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                              <CheckCircle2 className="size-4 text-zinc-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-200">{action.title}</p>
                              <p className="text-sm text-zinc-500 mt-1">{action.description}</p>
                              <div className="mt-3 flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300">
                                  {ACTION_WINDOW_LABEL[action.window]}
                                </span>
                                
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none">
        <div className="max-w-3xl mx-auto flex items-center justify-between p-4 md:px-8 md:py-5 bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto">
          <div className="hidden sm:block">
            <p className="font-semibold text-white">Want your own action plan?</p>
            <p className="text-sm text-zinc-400">Stop getting ghosted. AI career mapping for free.</p>
          </div>
          <div className="w-full sm:w-auto flex justify-center">
            <Button asChild size="lg" className="rounded-full w-full sm:w-auto font-bold bg-white text-black hover:bg-zinc-200">
              <Link href="/signup">
                Generate My Pathway
                <Sparkles className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
