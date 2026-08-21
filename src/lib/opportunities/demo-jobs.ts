/**
 * Realistic fictional job postings used to populate a new user's
 * Opportunities page with something to look at before they've pasted a
 * single real job - spans industries, seniority levels, locations and
 * (once run through the real pipeline against the user's own profile)
 * a natural spread of match quality. These are fed through the exact same
 * parse -> analyze -> prioritize pipeline as a pasted job - nothing about
 * the resulting Fit/Priority/gaps is hand-authored or fabricated, only the
 * posting text itself is fictional.
 */
export interface DemoJob {
  title: string;
  company: string;
  text: string;
}

export const DEMO_JOBS: DemoJob[] = [
  {
    title: "Bobst Library Student Assistant",
    company: "New York University",
    text: `Bobst Library Student Assistant
Company: New York University
Location: New York, NY
Employment Type: Part-time
Work Mode: Onsite

About the role:
NYU Libraries is seeking current students to assist at the Bobst Library circulation desk. You will help students and faculty locate materials, manage check-outs, and ensure the reading rooms are organized.

Requirements (must have):
- Current undergraduate or graduate student at New York University
- Excellent customer service and communication skills
- Available to work at least 10 hours per week, including some evenings or weekends
- Attention to detail

Preferred:
- Prior experience in a library or customer-facing role

Salary: USD 18 per hour
Industry: Higher Education
Seniority: Entry
Deadline: 2026-09-01`,
  },
  {
    title: "IT Help Desk Technician (Student)",
    company: "New York University",
    text: `IT Help Desk Technician (Student)
Company: New York University
Location: New York, NY
Employment Type: Part-time
Work Mode: Onsite

About the role:
NYU IT is hiring student workers to provide first-line technical support for students, faculty, and staff. You will troubleshoot Wi-Fi issues, assist with software installations, and help manage classroom AV equipment.

Requirements (must have):
- Current student at New York University
- Basic troubleshooting knowledge for Windows and macOS
- Strong communication and patience when helping users

Preferred:
- Familiarity with NYU's specific software suite (Brightspace, Albert, Zoom)

Salary: USD 20 per hour
Industry: Higher Education
Seniority: Entry
Deadline: 2026-09-15`,
  },
  {
    title: "Data Analytics Summer Intern",
    company: "Bloomberg",
    text: `Data Analytics Summer Intern
Company: Bloomberg
Location: New York, NY
Employment Type: Internship
Work Mode: Hybrid

About the role:
Join Bloomberg's Data team in NYC for a 10-week summer internship. You will analyze financial datasets, build dashboards, and help discover insights that impact global markets.

Requirements (must have):
- Currently pursuing a Bachelor's or Master's degree in Computer Science, Statistics, Mathematics, or related field
- Experience with SQL and relational databases
- Experience with Python or R for data analysis

Preferred:
- Strong interest in financial markets
- Previous internship experience in data or tech

Salary: USD 45 per hour
Industry: Financial Technology
Seniority: Entry
Deadline: 2026-11-01`,
  },
  {
    title: "Part-time Retail Associate",
    company: "Uniqlo",
    text: `Part-time Retail Associate
Company: Uniqlo
Location: New York, NY (SoHo)
Employment Type: Part-time
Work Mode: Onsite

About the role:
UNIQLO SoHo is looking for energetic Part-time Retail Associates to join our flagship store. This is a great opportunity for students looking for flexible hours in lower Manhattan.

Requirements (must have):
- Passion for customer service and retail
- Ability to work a flexible schedule, including weekends
- Strong teamwork and communication skills

Preferred:
- Previous retail experience

Salary: USD 19 per hour
Industry: Retail
Seniority: Entry
Deadline: 2026-10-15`,
  },
  {
    title: "Software Engineering Intern",
    company: "Spotify",
    text: `Software Engineering Intern
Company: Spotify
Location: New York, NY
Employment Type: Internship
Work Mode: Hybrid

About the role:
Spend your summer at Spotify NYC! Our engineering interns work on real features shipped to millions of users. You'll be embedded in a squad, write production code, and participate in hack weeks.

Requirements (must have):
- Currently enrolled in a Bachelor's or Master's program in Computer Science or related field
- Experience coding in Java, Python, C++, or JavaScript
- Strong understanding of data structures and algorithms

Preferred:
- Personal projects or open-source contributions
- Experience with web or mobile development frameworks

Salary: USD 50 per hour
Industry: Technology
Seniority: Entry
Deadline: 2026-10-30`,
  },
  {
    title: "Undergraduate Research Assistant - Paul G. Allen School",
    company: "University of Washington",
    text: `Undergraduate Research Assistant
Company: University of Washington
Location: Seattle, WA
Employment Type: Part-time
Work Mode: Onsite

About the role:
The Paul G. Allen School of Computer Science & Engineering is seeking undergraduate research assistants for the Human-Computer Interaction (HCI) lab. You will assist in designing user studies and analyzing qualitative data.

Requirements (must have):
- Current undergraduate student at the University of Washington
- Completion of CSE 142 and CSE 143 (or equivalent)
- Interest in Human-Computer Interaction

Preferred:
- Experience with web development (HTML/CSS/JS) for building study prototypes

Salary: USD 21 per hour
Industry: Higher Education
Seniority: Entry
Deadline: 2026-10-05`,
  },
  {
    title: "Husky Union Building (HUB) Event Staff",
    company: "University of Washington",
    text: `Husky Union Building (HUB) Event Staff
Company: University of Washington
Location: Seattle, WA
Employment Type: Part-time
Work Mode: Onsite

About the role:
Join the HUB Event Services team! Student staff are responsible for setting up rooms, managing AV equipment, and assisting guests during events at the heart of the UW campus.

Requirements (must have):
- Current UW student enrolled in at least 6 credits
- Ability to lift 30 lbs and stand for extended periods
- Customer service oriented

Preferred:
- Prior experience in event management or hospitality

Salary: USD 19.97 per hour
Industry: Higher Education
Seniority: Entry
Deadline: 2026-09-20`,
  },
  {
    title: "Software Development Engineer Intern",
    company: "Amazon",
    text: `Software Development Engineer Intern
Company: Amazon
Location: Seattle, WA
Employment Type: Internship
Work Mode: Hybrid

About the role:
Join Amazon in Seattle for a 12-week summer internship. You will write code that impacts millions of customers, working alongside experienced SDEs to design, develop, and test software solutions.

Requirements (must have):
- Currently enrolled in a Bachelor's or Master's degree in Computer Science or related field
- Experience with object-oriented design and coding in Java, C++, or Python
- Solid understanding of data structures and algorithms

Preferred:
- Previous technical internship
- Experience with AWS or cloud technologies

Salary: USD 9,500 per month
Industry: Technology
Seniority: Entry
Deadline: 2026-11-15`,
  },
  {
    title: "Barista",
    company: "Starbucks",
    text: `Barista
Company: Starbucks
Location: Seattle, WA (University Village)
Employment Type: Part-time
Work Mode: Onsite

About the role:
We are hiring Baristas for our University Village location! This is a fast-paced environment perfect for students looking for flexible shifts near the UW campus.

Requirements (must have):
- Ability to learn quickly and thrive in a fast-paced environment
- Strong interpersonal skills
- Available for early morning, evening, or weekend shifts

Preferred:
- Prior experience in food service or retail

Salary: USD 20 per hour + tips
Industry: Food & Beverage
Seniority: Entry
Deadline: 2026-10-10`,
  },
  {
    title: "Marketing Intern",
    company: "Pike Place Market Foundation",
    text: `Marketing Intern
Company: Pike Place Market Foundation
Location: Seattle, WA
Employment Type: Internship
Work Mode: Hybrid

About the role:
The Pike Place Market Foundation is seeking a Marketing Intern to help manage our social media channels and draft content for our newsletter. A great opportunity for students interested in non-profit marketing.

Requirements (must have):
- Currently pursuing a degree in Marketing, Communications, or related field
- Excellent written communication skills
- Familiarity with Instagram, TikTok, and Facebook for business

Preferred:
- Experience with Canva or Adobe Creative Suite
- Passion for community building

Salary: USD 22 per hour
Industry: Non-Profit
Seniority: Entry
Deadline: 2026-10-31`,
  },
];
