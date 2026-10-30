/** The documents in a job's application kit. Shared by server and browser. */
export const KIT_ITEMS = ["resume", "cover", "note", "interview"] as const;
export type KitItem = (typeof KIT_ITEMS)[number];

export const KIT_LABEL: Record<KitItem, string> = {
  resume: "Resume",
  cover: "Cover letter",
  note: "Hiring-manager note",
  interview: "Interview prep",
};

/** Where each document lives, under /opportunities/[id]/. */
export const KIT_PATH: Record<KitItem, string> = {
  resume: "resume",
  cover: "letter",
  note: "note",
  interview: "prep",
};
