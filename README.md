# Workly: The AI Career Intelligence Platform

Workly is a next-generation career intelligence application designed to stop the "spray and pray" job hunt. Instead of generic job boards, Workly acts as a personalized career coach: it parses your resume, dynamically scours the internet for roles that actually fit your profile, aggressively filters out irrelevant domains, and provides step-by-step AI coaching to help you land your dream job.

---

## 🟢 The Free Features (The Core Engine)
*Everything a user needs to build their profile, discover jobs, and manage their search.*

### 1. Profile Generation & Parsing
* **PDF Resume Upload:** Drag and drop your CV. Workly’s parser extracts your hard skills, soft skills, and career timeline to build a structured profile.
* **Career Goal Setting:** Define your target role, preferred industry, and target salary so the AI knows what to prioritize.

### 2. The Discovery Engine
* **Global API Aggregators:** Automatically pulls live jobs from massive databases like Adzuna, Jooble, Reed, and Findwork.
* **Target Company ATS Scraper:** Enter a specific company (e.g., "Apple"). Workly dynamically detects if they use Greenhouse or Lever and injects their unlisted jobs directly into your feed.
* **Search by College Major:** Finds roles historically tied to your specific degree.
* **Automated Job Alerts:** Set up background watchers to notify you when perfect matches appear.

### 3. The Analytics & Tracking
* **Strict Industry Gating (The Fit Score):** Workly mathematically calculates how well you match a job. If the job is in a completely irrelevant domain (e.g., Nursing vs. City Planning), the score is aggressively penalized to 0% to keep your feed clean.
* **Job Bookmarking & Kanban Tracking:** Move jobs from "Discovered" -> "Saved" -> "Applied" -> "Interviewing" on a visual board.
* **1 Free Dream Job Analysis:** Paste a job description to get a Readiness Score and a gap analysis of missing skills.

### 4. Specialized Modes
* **Student Mode:** Restricts job hours to legal limits, prioritizes campus jobs, and highlights internships.
* **Freelance / Gig Mode:** Changes the discovery engine to prioritize contract work, gig economy roles, and pipeline management.
* **Part-Time Mode:** Hyper-local search prioritizing shift-based and hourly roles based on your availability schedule.

---

## 🟡 Workly Pro Features (The AI Power-Ups)
*The compute-heavy AI features designed to save you hours of manual work and give you an unfair advantage.*

### 1. Unlimited AI Dream Job Analyses
Run unlimited gap analyses against any job description on the internet to see exactly why you are getting rejected and what skills you are missing.

### 2. AI Resume Tailoring (ATS Bypass)
Click a button and Workly will automatically rewrite your resume bullets to perfectly align with the target job description, ensuring you pass automated ATS filters.

### 3. The Dream Pathway
A deeply personalized, interactive career coaching board:
* **30/60/90-Day Action Plan:** A step-by-step syllabus on how to bridge your skill gaps.
* **Curated Learning:** Direct links to specific Coursera and Udemy courses tailored to your missing skills.
* **Weekly Check-ins:** Dynamic updates to your readiness score as you learn.

### 4. Application Strategy
AI-generated, highly customized Cover Letters and Cold Email templates tailored to the hiring manager of the specific job you are applying for.

### 5. Interview Prep & What-If Simulator
An AI coaching tool that generates the exact technical and behavioral questions you are most likely to be asked based on the job description and your specific resume weaknesses.

### 6. The Technical Sandbox
An interactive coding and skill-testing environment where the AI acts as a senior engineer, reviewing your code and helping you learn the exact technical skills required for your dream job.

---

## Architecture & Stack
- **Framework:** Next.js 16 App Router (React 19)
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (raw `pg` pool used for all queries)
- **Authentication:** Local JWT
- **AI/Parsing:** OpenAI-compatible AI endpoints (Gemini) + Deterministic Scoring
- **Payments:** Lemon Squeezy (Webhooks & API)

## Local Development
1. Clone the repository and run `npm install`
2. Add your API keys to `.env` (Database, LLM, Lemon Squeezy).
3. Run `npm run setup` to start the PostgreSQL container and run migrations.
4. Run `npm run dev` to start the development server.
