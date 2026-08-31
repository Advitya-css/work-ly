import { UserRound, Compass, ListFilter, TrendingUp, LineChart } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserRound,
    title: "Understand yourself",
    description:
      "Your career profile captures real experience, skills, and preferences. Entered by you. Work-ly never invents qualifications you don't have.",
  },
  {
    number: "02",
    icon: Compass,
    title: "Discover opportunities",
    description:
      "Relevant roles are surfaced from legitimate sources and user submissions. Not scraped, not spammy, not thousands of duplicates.",
  },
  {
    number: "03",
    icon: ListFilter,
    title: "Prioritize what matters",
    description:
      "Every opportunity is ranked with a plain-language explanation of why it's worth your time, so you're not sorting through noise.",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Close your gaps",
    description:
      "See exactly what separates your profile from a target role, and get a concrete, sequenced pathway for closing that gap.",
  },
  {
    number: "05",
    icon: LineChart,
    title: "Track what works",
    description:
      "Application outcomes feed back into the system, so future recommendations get sharper the more you use it.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
            One system, from profile to offer
          </h2>
          <p className="mt-3 text-muted-foreground">
            Each step feeds the next. Nothing here is a standalone tool bolted onto a job board.
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
