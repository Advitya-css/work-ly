import { UserRound, Compass, ListFilter, TrendingUp, LineChart } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserRound,
    title: "Build your profile",
    description:
      "Upload your resume once. Work-ly turns it into a career profile you can check and edit. It never invents qualifications you don't have.",
  },
  {
    number: "02",
    icon: Compass,
    title: "Check your fit",
    description:
      "Paste a role you're considering, or let Work-ly match you against public listings, and see your Candidate Fit with the reasons behind it.",
  },
  {
    number: "03",
    icon: ListFilter,
    title: "Tailor every application",
    description:
      "Get a resume and cover letter written for that role from your real experience, plus a short note to the hiring manager.",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Practise and grow",
    description:
      "Rehearse with mock interviews, see what separates you from the role you want, and follow a step-by-step plan to close the gap.",
  },
  {
    number: "05",
    icon: LineChart,
    title: "Track what works",
    description:
      "Log your applications and outcomes, so you can see which roles and resumes actually get you interviews.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
            One coach, from resume to offer
          </h2>
          <p className="mt-3 text-muted-foreground">
            Work-ly is software you use for your own career. Each step builds on the last.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-3 bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-accent">
                  <step.icon className="size-4 text-accent-foreground" strokeWidth={1.75} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{step.number}</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
