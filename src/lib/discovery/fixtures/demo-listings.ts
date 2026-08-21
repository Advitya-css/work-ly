/**
 * Fictional listings for the demo source.
 *
 * Nothing here is a real vacancy and nothing was fetched from anywhere.
 * They exist so the discovery pipeline can be run and judged end-to-end
 * without credentials.
 *
 * Composition is deliberate:
 *  - A documentary/film cluster, so hidden role discovery has related-but-
 *    differently-titled roles to find ("documentary filmmaking" should
 *    surface Story Producer, not just anything with "documentary" in it).
 *  - An analytics cluster spanning junior to lead, so bucketing produces a
 *    real spread rather than everything landing in one band.
 *  - Two intentional near-duplicates (ids 18 and 19) of earlier listings,
 *    under different company spellings and reworded descriptions, so
 *    deduplication has something genuine to catch.
 */
export interface DemoListing {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  industry: string;
  url: string;
  postedDaysAgo: number;
  description: string;
}

export const DEMO_LISTINGS: DemoListing[] = [
  {
    id: "doc-01",
    title: "Documentary Producer",
    company: "Northlight Films",
    location: "London",
    country: "United Kingdom",
    industry: "Media",
    url: "https://example.invalid/northlight/documentary-producer",
    postedDaysAgo: 3,
    description: `Documentary Producer
Northlight Films is looking for a Documentary Producer to take feature-length projects from development through delivery.

Requirements (must have):
- 4+ years of experience producing documentary or factual content
- Experience managing production budgets and schedules
- Experience with story development and edit supervision
- Strong written and verbal communication skills

Preferred:
- Experience with archive research and rights clearance
- Familiarity with broadcaster delivery specifications

Salary: GBP 45,000 - 58,000
Seniority: Mid`,
  },
  {
    id: "doc-02",
    title: "Story Producer",
    company: "Meridian Factual",
    location: "London",
    country: "United Kingdom",
    industry: "Media",
    url: "https://example.invalid/meridian/story-producer",
    postedDaysAgo: 6,
    description: `Story Producer
Meridian Factual is hiring a Story Producer to shape narrative across a returning documentary series.

Requirements (must have):
- 3+ years of experience in factual or documentary production
- Experience structuring stories from raw footage
- Experience working closely with edit teams
- Strong research skills

Preferred:
- Experience with long-form interview production
- Experience writing voiceover scripts

Salary: GBP 40,000 - 52,000
Seniority: Mid`,
  },
  {
    id: "doc-03",
    title: "Documentary Researcher",
    company: "Northlight Films",
    location: "Manchester",
    country: "United Kingdom",
    industry: "Media",
    url: "https://example.invalid/northlight/documentary-researcher",
    postedDaysAgo: 11,
    description: `Documentary Researcher
Support a documentary strand with contributor sourcing, archive research and fact-checking.

Requirements (must have):
- 1+ years of research experience, ideally in factual television
- Strong research and fact-checking skills
- Excellent written communication
- Attention to detail

Preferred:
- Experience with archive libraries
- Interest in current affairs

Salary: GBP 26,000 - 32,000
Seniority: Junior`,
  },
  {
    id: "doc-04",
    title: "Creative Producer",
    company: "Halden Studio",
    location: "Bristol",
    country: "United Kingdom",
    industry: "Media",
    url: "https://example.invalid/halden/creative-producer",
    postedDaysAgo: 2,
    description: `Creative Producer
Halden Studio is looking for a Creative Producer across branded documentary and short-form work.

Requirements (must have):
- 5+ years of experience producing video content
- Experience pitching and developing creative concepts
- Experience managing client relationships
- Experience managing budgets

Preferred:
- Experience with documentary formats
- Experience directing

Salary: GBP 50,000 - 65,000
Seniority: Senior`,
  },
  {
    id: "doc-05",
    title: "Production Coordinator",
    company: "Meridian Factual",
    location: "London",
    country: "United Kingdom",
    industry: "Media",
    url: "https://example.invalid/meridian/production-coordinator",
    postedDaysAgo: 8,
    description: `Production Coordinator
Coordinate logistics, scheduling and paperwork across multiple factual productions.

Requirements (must have):
- 2+ years of experience coordinating productions
- Strong organisation and scheduling skills
- Experience with production paperwork and compliance
- Excellent communication skills

Preferred:
- Experience with location shoots
- Experience with crew booking

Salary: GBP 30,000 - 36,000
Seniority: Junior`,
  },
  {
    id: "an-01",
    title: "Product Analyst",
    company: "Northwind Retail",
    location: "London",
    country: "United Kingdom",
    industry: "Retail",
    url: "https://example.invalid/northwind/product-analyst",
    postedDaysAgo: 4,
    description: `Product Analyst
Help the product team understand user behaviour across our e-commerce platform.

Requirements (must have):
- 2+ years of experience in an analyst role
- Strong SQL skills
- Experience building dashboards for stakeholders
- Bachelor's degree in a quantitative field

Preferred:
- Experience with Python
- Familiarity with A/B testing

Salary: GBP 45,000 - 58,000
Seniority: Mid`,
  },
  {
    id: "an-02",
    title: "Senior Product Analyst",
    company: "Lumen Analytics",
    location: "Remote",
    country: "United Kingdom",
    industry: "Software",
    url: "https://example.invalid/lumen/senior-product-analyst",
    postedDaysAgo: 1,
    description: `Senior Product Analyst
Lead analysis for a portfolio of SaaS client accounts.

Requirements (must have):
- 5+ years of experience in product analytics
- Advanced SQL skills
- Experience presenting recommendations to stakeholders
- Bachelor's degree in a quantitative field

Preferred:
- Experience with Python
- Experience with Amplitude or Mixpanel

Salary: GBP 65,000 - 80,000
Work Mode: Remote
Seniority: Senior`,
  },
  {
    id: "an-03",
    title: "Data Analyst",
    company: "Meridian Bank",
    location: "Chicago",
    country: "United States",
    industry: "Financial Services",
    url: "https://example.invalid/meridian-bank/data-analyst",
    postedDaysAgo: 14,
    description: `Data Analyst
Support risk and operations teams with reporting and analysis.

Requirements (must have):
- 2+ years of experience with SQL and relational databases
- Experience building reports and dashboards
- Strong attention to detail
- Bachelor's degree in a quantitative field

Preferred:
- Experience with Tableau
- Experience in financial services

Salary: USD 75,000 - 90,000
Seniority: Junior`,
  },
  {
    id: "an-04",
    title: "Analytics Lead",
    company: "Vantage Labs",
    location: "London",
    country: "United Kingdom",
    industry: "Software",
    url: "https://example.invalid/vantage/analytics-lead",
    postedDaysAgo: 5,
    description: `Analytics Lead
Set analytics direction across product and growth teams.

Requirements (must have):
- 8+ years of experience in analytics
- Experience leading and mentoring analysts
- Deep expertise in SQL and experimentation
- Track record setting measurement strategy across teams

Preferred:
- Experience with dbt
- Experience presenting to executives

Salary: GBP 95,000 - 115,000
Seniority: Lead`,
  },
  {
    id: "an-05",
    title: "Research Analyst",
    company: "Beacon Institute",
    location: "London",
    country: "United Kingdom",
    industry: "Research",
    url: "https://example.invalid/beacon/research-analyst",
    postedDaysAgo: 7,
    description: `Research Analyst
Conduct quantitative and qualitative research on economic policy questions.

Requirements (must have):
- 2+ years of research experience
- Strong quantitative analysis skills
- Excellent written communication
- Bachelor's degree in economics, statistics or a related field

Preferred:
- Experience with Python or R
- Published writing

Salary: GBP 38,000 - 48,000
Seniority: Mid`,
  },
  {
    id: "an-06",
    title: "Policy Analyst",
    company: "Kestrel Policy",
    location: "London",
    country: "United Kingdom",
    industry: "Research",
    url: "https://example.invalid/kestrel/policy-analyst",
    postedDaysAgo: 9,
    description: `Policy Analyst
Analyse and write on public policy, translating research into recommendations.

Requirements (must have):
- 3+ years of policy or research experience
- Strong research and writing skills
- Experience communicating with non-technical audiences
- Master's degree in public policy, economics or a related field

Preferred:
- Quantitative analysis skills
- Stakeholder engagement experience

Salary: GBP 42,000 - 55,000
Seniority: Mid`,
  },
  {
    id: "eng-01",
    title: "Analytics Engineer",
    company: "Riverstone Fintech",
    location: "Remote",
    country: "Canada",
    industry: "Fintech",
    url: "https://example.invalid/riverstone/analytics-engineer",
    postedDaysAgo: 10,
    description: `Analytics Engineer
Build and maintain the transformation layer powering company reporting.

Requirements (must have):
- 3+ years of experience with SQL
- Experience with dbt or similar transformation tooling
- Experience with data modelling
- Experience with version control

Preferred:
- Experience with Python
- Experience in fintech

Salary: CAD 95,000 - 120,000
Work Mode: Remote
Seniority: Mid`,
  },
  {
    id: "eng-02",
    title: "DevOps Engineer",
    company: "Ironclad Systems",
    location: "Berlin",
    country: "Germany",
    industry: "Infrastructure",
    url: "https://example.invalid/ironclad/devops-engineer",
    postedDaysAgo: 12,
    description: `DevOps Engineer
Improve deployment pipelines and infrastructure reliability.

Requirements (must have):
- 3+ years of experience with cloud infrastructure
- Experience with Kubernetes and Docker
- Experience building CI/CD pipelines
- Experience with infrastructure as code

Preferred:
- Experience with observability tooling
- Fluent German

Salary: EUR 75,000 - 90,000
Seniority: Mid`,
  },
  {
    id: "eng-03",
    title: "Senior Frontend Engineer",
    company: "Fernwood Digital",
    location: "Remote",
    country: "United States",
    industry: "Software",
    url: "https://example.invalid/fernwood/senior-frontend-engineer",
    postedDaysAgo: 15,
    description: `Senior Frontend Engineer
Own key parts of our customer dashboard and mentor engineers.

Requirements (must have):
- 5+ years of experience with JavaScript and React
- Strong proficiency in TypeScript
- Experience with REST APIs
- Bachelor's degree in Computer Science or related field

Preferred:
- Experience with Node.js
- Experience with automated testing

Salary: USD 135,000 - 165,000
Work Mode: Remote
Seniority: Senior`,
  },
  {
    id: "ux-01",
    title: "UX Researcher",
    company: "BrightPath Health",
    location: "New York",
    country: "United States",
    industry: "Healthcare",
    url: "https://example.invalid/brightpath/ux-researcher",
    postedDaysAgo: 13,
    description: `UX Researcher
Lead qualitative and quantitative research for patient-facing products.

Requirements (must have):
- 4+ years of experience in UX research
- Experience designing and running usability studies
- Experience synthesising research for product teams
- Master's degree in a related field

Preferred:
- Experience in healthcare
- Familiarity with survey design

Salary: USD 110,000 - 130,000
Seniority: Mid`,
  },
  {
    id: "pm-01",
    title: "Product Manager",
    company: "Northwind Retail",
    location: "London",
    country: "United Kingdom",
    industry: "Retail",
    url: "https://example.invalid/northwind/product-manager",
    postedDaysAgo: 6,
    description: `Product Manager
Own the checkout and payments experience across our e-commerce platform.

Requirements (must have):
- 5+ years of product management experience
- Experience shipping consumer-facing products
- Experience working with engineering and design
- Strong written and verbal communication

Preferred:
- Experience in payments
- Experience with experimentation

Salary: GBP 85,000 - 105,000
Seniority: Senior`,
  },
  {
    id: "ops-01",
    title: "Operations Analyst",
    company: "Pixel Forge",
    location: "Austin",
    country: "United States",
    industry: "Design",
    url: "https://example.invalid/pixelforge/operations-analyst",
    postedDaysAgo: 20,
    description: `Operations Analyst
Support studio operations with reporting, forecasting and process improvement.

Requirements (must have):
- 1+ years of analytical experience
- Strong Excel skills
- Good communication skills
- Attention to detail

Preferred:
- SQL experience
- Experience in a creative studio

Salary: USD 55,000 - 68,000
Seniority: Entry`,
  },
  // --- Intentional near-duplicates, for the deduplicator to catch -------
  {
    id: "dup-01",
    title: "Product Analyst",
    company: "Northwind Retail Ltd",
    location: "London, UK",
    country: "United Kingdom",
    industry: "Retail",
    url: "https://example.invalid/aggregator/northwind-product-analyst?utm_source=feed",
    postedDaysAgo: 4,
    description: `Product Analyst
Help the product team understand user behaviour across our e-commerce platform.

Requirements (must have):
- 2+ years of experience in an analyst role
- Strong SQL skills
- Experience building dashboards for stakeholders
- Bachelor's degree in a quantitative field

Preferred:
- Experience with Python
- Familiarity with A/B testing

Salary: GBP 45,000 - 58,000
Seniority: Mid`,
  },
  {
    id: "dup-02",
    title: "Documentary Producer",
    company: "Northlight Films Inc.",
    location: "London",
    country: "United Kingdom",
    industry: "Media",
    url: "https://example.invalid/board/northlight-doc-producer",
    postedDaysAgo: 3,
    description: `Documentary Producer
Northlight Films seeks a Documentary Producer to run feature-length projects from development through to delivery.

Requirements (must have):
- 4+ years of experience producing documentary or factual content
- Experience managing production budgets and schedules
- Experience with story development and edit supervision
- Strong written and verbal communication skills

Preferred:
- Experience with archive research and rights clearance
- Familiarity with broadcaster delivery specifications

Salary: GBP 45,000 - 58,000
Seniority: Mid`,
  },
];
