/**
 * What Workly can explain about itself without calling a model.
 *
 * This exists because the most common questions a new user has are not really
 * career questions at all. They are "what is this number", "why is that job
 * above this one", "what am I supposed to do next". Those have exact answers
 * that live in this codebase, and a language model asked the same question
 * would guess at them and sometimes guess wrong.
 *
 * So the curated answers below are checked FIRST, and the model is only asked
 * about things genuinely outside this list. That has three benefits: answers
 * about how Workly works are always correct, they cost nothing, and the help
 * still works with no API key configured at all.
 */

export interface KnowledgeEntry {
  id: string;
  /** Lowercase words and phrases that indicate this question. */
  triggers: string[];
  question: string;
  answer: string;
}

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "fit-score",
    triggers: [
      "fit score", "what is fit", "fit mean", "candidate fit", "match score",
      "how well i match", "how well do i match", "what does fit",
    ],
    question: "What does the Fit score mean?",
    answer:
      "Fit is how closely your profile lines up with what a posting asks for, out of 100. It is built from seven parts with fixed weights: skills (30), experience (25), industry relevance (15), education (10), seniority (10), evidence behind your skills (5) and location (5).\n\nIt is a measure of overlap, not a prediction. Workly will never tell you your chances of being hired, because nothing in your profile or the posting can support that claim.",
  },
  {
    id: "priority-score",
    triggers: [
      "priority score", "priority mean", "priority vs fit",
      "difference between fit and priority", "priority different from fit",
      "priority different", "fit and priority", "fit vs priority",
      "what does priority",
    ],
    question: "How is Priority different from Fit?",
    answer:
      "Fit asks whether you could get the job. Priority asks whether it is worth your time.\n\nThey come apart often. A role a level below your current one might score high on Fit and low on Priority, because taking it would move your career sideways or backwards. Priority weighs the match against your stated goals, the salary, the seniority direction and how competitive the role is. Fit can contribute at most 25 of Priority's 100 points, so a strong match can never on its own make something a priority.",
  },
  {
    id: "competition",
    triggers: ["competition", "competitive", "how many applicants"],
    question: "What does the competition label mean?",
    answer:
      "It is an estimate of how contested a role is likely to be, based on signals in the posting itself: how broad the requirements are, the seniority, whether it is remote, and how long it has been open. It is not a count of real applicants, because no public source gives that number honestly.",
  },
  {
    id: "next-step",
    triggers: ["what should i do", "where do i start", "what next", "getting started", "how do i use", "first step"],
    question: "What should I do first?",
    answer:
      "In this order:\n\n1. Upload your CV on Career Profile. Everything else reads from it.\n2. Set a goal on Career Goals, even a rough one. Without it Workly can score how well you match a job, but not whether the job is worth pursuing.\n3. Analyze a job you are actually considering, or press Discover to pull some in.\n4. Once you have a few, open Career Path to see what is standing between you and the roles you want.",
  },
  {
    id: "why-ranked",
    triggers: ["why is this ranked", "ranking", "why is that above", "sort order", "why first"],
    question: "Why is one opportunity above another?",
    answer:
      "Opportunities sort by Priority, not by Fit. Open any one of them and the analysis page breaks the number down component by component, with the reasoning written out for each. If a job is lower than you expected, that page will say which component pulled it down.",
  },
  {
    id: "pathway",
    triggers: ["career path", "pathway", "steps", "30 60 90", "plan"],
    question: "What is the Career Path for?",
    answer:
      "It turns the gaps between where you are and where you said you want to be into an ordered list of things to do. The order is deliberate: positioning and evidence first, because they are quick and change how everything else reads, then portfolio, skills, credentials, and finally the slow structural things like seniority.\n\nThe 30, 60 and 90 day windows are assigned by how hard each action is, not by where it happens to sit in the list.",
  },
  {
    id: "gap",
    triggers: ["gap", "missing", "what am i missing", "readiness"],
    question: "How does Workly decide what I am missing?",
    answer:
      "It compares the requirements it read out of a posting against what is on your profile, and separates three things: requirements you meet with evidence, requirements you have stated but not evidenced, and requirements you do not have at all.\n\nThat middle category matters. A skill listed on your CV with nothing behind it scores lower than the same skill attached to a project or an achievement, which is usually the cheapest gap to close.",
  },
  {
    id: "discovery-sources",
    triggers: ["where do jobs come from", "sources", "scraping", "linkedin", "indeed", "glassdoor"],
    question: "Where do the discovered jobs come from?",
    answer:
      "Company career pages that publish a public feed, employer and university feeds, government job boards, licensed API providers, and anything you paste in yourself.\n\nWorkly does not scrape LinkedIn, Indeed, Glassdoor or any service whose terms prohibit automated access. Every listing shows its source and a link, so you can always check it at the origin.",
  },
  {
    id: "applications",
    triggers: ["application", "track", "outcome", "interview rate", "applied"],
    question: "How does application tracking work?",
    answer:
      "Log a role once and move it through the stages as things happen. Workly records each milestone permanently rather than only your current status, so an interview that later ended in rejection still counts toward your interview rate. Otherwise someone interviewing steadily but not converting would see 0%, which is both wrong and demoralising.\n\nIt holds off on drawing conclusions until there are at least 8 sent applications, and at least 3 in any group it wants to compare.",
  },
  {
    id: "privacy",
    triggers: ["privacy", "data", "delete", "who sees", "stored", "gdpr"],
    question: "What happens to my data?",
    answer:
      "Your CV and profile live in your own database and are never shared with another user. Settings has controls to delete your CV, your career data, or your whole account, and deletions remove the stored files too.\n\nIf you have configured an AI provider, the text of a CV or job description you ask it to parse is sent to that provider. Everything else, including all scoring, runs locally with no network call.",
  },
  {
    id: "how-to-location-salary",
    triggers: ["where do i set my location", "set my location", "change my location", "add location", "where do i set my salary", "set salary", "change salary", "target salary", "preferences"],
    question: "Where do I set my location, salary, and preferences?",
    answer: "Your current 'Home Location' can be set in **My career > Profile**. \n\nTo set your **target salary, preferred locations, and work modes** (Remote/Hybrid), go to **My career > Goals** and click 'Add a career goal'. The Priority Engine uses these goals to score jobs for you."
  },
  {
    id: "how-to-delete",
    triggers: ["how do i delete", "delete a job", "remove a job", "delete application"],
    question: "How do I delete a job or application?",
    answer: "Open the specific job or application from the Opportunities or Applications board. On the detailed analysis page, look for the 'Delete' button near the top right of the page header."
  },
  {
    id: "accuracy",
    triggers: ["wrong", "inaccurate", "mistake", "not right", "bad parse", "misread"],
    question: "The parsed information is wrong. What do I do?",
    answer:
      "Edit it. Every section of your career profile is editable, and anything Workly extracted rather than you entering is flagged as unverified until you confirm it.\n\nIf a lot came out wrong, the likely cause is that no AI provider is configured, so a pattern-matching fallback read the document. It is deliberately cautious and will not guess. Your scores improve immediately once the profile is corrected.",
  },
];

/**
 * Finds the curated answer for a question, if there is one.
 *
 * Scored rather than first-match: a question like "what is the difference
 * between fit and priority" contains "fit" and would otherwise be answered by
 * the Fit entry alone, when the Priority entry is the better response.
 */
export function findKnowledge(question: string): KnowledgeEntry | null {
  const text = question.toLowerCase().trim();
  let best: { entry: KnowledgeEntry; score: number } | null = null;

  for (const entry of KNOWLEDGE) {
    let score = 0;

    // An exact match on the entry's own question always wins. The suggested
    // questions in the panel are these strings verbatim, and tapping one has
    // to return its answer rather than falling through to the model.
    if (text === entry.question.toLowerCase()) return entry;

    for (const trigger of entry.triggers) {
      if (text.includes(trigger)) {
        // A longer trigger is a more specific match, so it counts for more.
        score += trigger.length;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }

  return best?.entry ?? null;
}

/** Exact lookup, for when the caller already knows which answer it wants. */
export function knowledgeById(id: string): KnowledgeEntry | null {
  return KNOWLEDGE.find((entry) => entry.id === id) ?? null;
}

/**
 * The questions offered as one-tap suggestions, chosen by which page the user
 * is looking at. Someone staring at a screen they do not understand should
 * not also have to work out what to type.
 */
export const SUGGESTIONS_BY_PATH: { match: RegExp; ids: string[] }[] = [
  { match: /^\/dashboard/, ids: ["next-step", "fit-score", "privacy"] },
  { match: /^\/opportunities/, ids: ["priority-score", "why-ranked", "competition"] },
  { match: /^\/analyze-job/, ids: ["fit-score", "gap", "accuracy"] },
  { match: /^\/discover/, ids: ["discovery-sources", "why-ranked", "priority-score"] },
  { match: /^\/career-profile/, ids: ["accuracy", "gap", "privacy"] },
  { match: /^\/career-goals/, ids: ["priority-score", "next-step"] },
  { match: /^\/career-path/, ids: ["pathway", "gap", "next-step"] },
  { match: /^\/dream-job/, ids: ["gap", "pathway", "fit-score"] },
  { match: /^\/applications/, ids: ["applications", "next-step"] },
  { match: /^\/settings/, ids: ["privacy", "accuracy"] },
];

export function suggestionsForPath(pathname: string): KnowledgeEntry[] {
  const match = SUGGESTIONS_BY_PATH.find((entry) => entry.match.test(pathname));
  const ids = match?.ids ?? ["next-step", "fit-score", "priority-score"];
  return ids
    .map((id) => KNOWLEDGE.find((entry) => entry.id === id))
    .filter((entry): entry is KnowledgeEntry => Boolean(entry));
}
