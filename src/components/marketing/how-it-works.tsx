import { UserRound, Compass, ListFilter, TrendingUp, LineChart } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserRound,
    title: "Build your profile",
    description:
      "Upload your resume once. Check it, edit it.",
  },
  {
    number: "02",
    icon: Compass,
    title: "Check your fit",
    description:
      "Paste a job, or let Work-ly find them. See your fit and why.",
  },
  {
    number: "03",
    icon: ListFilter,
    title: "Tailor every application",
    description:
      "A resume, cover letter and note written for each job.",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Practise and grow",
    description:
      "Mock interviews and a plan to close your gaps.",
  },
  {
    number: "05",
    icon: LineChart,
    title: "Track what works",
    description:
      "See which jobs and resumes get you interviews.",
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
            Five steps, each building on the last.
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
