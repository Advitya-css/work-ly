# Running Workly on your Mac

Written assuming you've never run a project like this before. Every step is
click-by-click. Total time: about 15 minutes, most of it waiting for
downloads.

You need to do steps 1 and 2 **once ever**. After that, starting Workly is
a single command.

---

## Step 1 — Install Node.js

Node is the engine that runs the app.

1. Go to **https://nodejs.org**
2. Click the big green button on the left (it says **LTS** — that means the
   stable version)
3. Open the file that downloads, and click Continue → Continue → Agree →
   Install. Enter your Mac password when asked.

That's it. Nothing to configure.

---

## Step 2 — Install PostgreSQL

Postgres is the database — it's where your profile, saved jobs, and
analyses get stored.

1. Go to **https://postgresapp.com**
2. Click **Download**
3. Open the downloaded file, and drag the elephant icon into your
   **Applications** folder
4. Open **Postgres** from Applications
   - If macOS warns you it's from the internet, click **Open**
5. Click the **Initialize** button

You should now see a green light and the word **Running**.

> **Leave this app open whenever you use Workly.** If Postgres isn't
> running, Workly can't start. That's the single most common problem, and
> the fix is just opening this app.

---

## Step 3 — Open the project in VS Code

1. Unzip the Workly folder if you haven't already (double-click the .zip)
2. Open **VS Code**
3. Menu bar → **File** → **Open Folder…**
4. Select the **`workly`** folder and click **Open**
5. If VS Code asks *"Do you trust the authors of the files in this
   folder?"* → click **Yes, I trust the authors**

You should now see the project files listed down the left side.

---

## Step 4 — Open the terminal inside VS Code

This is the part that trips people up, so: you do **not** need a separate
Terminal app. VS Code has one built in.

Menu bar → **Terminal** → **New Terminal**

A panel opens at the bottom of the window with a blinking cursor. That's
where you type the commands below.

Type each one, press **Enter**, and wait for it to finish before typing the
next.

---

## Step 5 — Three commands

### 5a. Install the project's building blocks

```
npm install
```

Takes 1–3 minutes. You'll see a wall of scrolling text — that's normal.
Warnings in yellow are fine. Only red **ERROR** text is a problem.

### 5b. Set up the database

```
npm run setup
```

This creates the database and builds all the tables. You should see:

```
✓ Created database "workly_dev"
✓ Applied 20260817000000_init
✓ Applied 20260819000000_cv_ingestion
✓ Applied 20260821000000_career_goals_and_jobs
✓ Applied 20260825000000_opportunities
✓ Applied 20260901000000_dream_jobs
✓ Applied 20260910000000_career_pathways

✓ Database ready — applied 6 migrations.
```

It's safe to run this again any time — it skips whatever's already done.

### 5c. Start the app

```
npm run dev
```

After a few seconds you'll see:

```
▲ Next.js 16.3.1
- Local:  http://localhost:3000
✓ Ready in 3.4s
```

---

## Step 6 — Open it

Go to **http://localhost:3000** in your browser.

Click **Sign up**, and make an account with any email and password you
like. It's your own database on your own machine — it isn't a real account
anywhere and no email gets sent.

Then have a look at:

| Page | What it does |
|---|---|
| **Career Profile** | Your skills, experience, education |
| **Career Goals** | What you're aiming for |
| **Analyze a Job** | Paste any job posting, get a fit score |
| **Opportunities** | Every job you've analyzed, ranked by what's worth your time |
| **Dream Job** | How close you are to a goal role, and how to close the gap |
| **Career Path** | An ordered route to your target, with a 30/60/90 day plan you can tick off |

**Tip:** On the Opportunities page, click **Load demo opportunities** to
fill it with 12 realistic example jobs so you can see it working
straight away.

---

## Stopping and starting

**To stop:** click into the terminal and press **Ctrl + C**.

**To start again later:**

1. Open the Postgres app (green light showing)
2. Open the workly folder in VS Code
3. Terminal → New Terminal
4. `npm run dev`

That's it. Steps 1, 2 and 5a/5b never need repeating.

---

## When something goes wrong

### "Couldn't reach PostgreSQL"
The Postgres app isn't running. Open it from Applications and check for the
green light.

### "command not found: npm"
Node.js didn't install, or VS Code was open during the install. **Quit VS
Code completely** (Cmd + Q) and reopen it.

### Port 3000 is already in use
Workly is already running in another terminal. Either use that one, or
press Ctrl + C in it first.

### The page won't load / shows an error
Look at the VS Code terminal — the actual reason is printed there. Copy the
red text and send it to me.

### The database is in a broken state
Start over cleanly:

```
npm run db:reset
npm run setup
```

This erases everything you've entered and rebuilds empty tables.

---

## Optional: turning on Gemini

**You do not need this.** All the scoring — fit, priority, the dream-job
gap engine — is calculated by code on your machine and never uses AI.

AI only improves two things: reading a CV, and reading a job posting.

To turn it on:

1. Open the file called **`.env`** in VS Code (it's in the file list on the
   left; if you can't see it, it's near the top with a gear-ish icon)
2. Change `AI_PROVIDER="stub"` to `AI_PROVIDER="openai-compatible"`
3. Put your Google AI Studio key between the quotes on `AI_API_KEY=""`
4. Save (Cmd + S)
5. Stop the server (Ctrl + C) and run `npm run dev` again — **a restart is
   required**, refreshing the page won't do it

**To check it worked:** analyze a job, then look at the terminal for a line
starting with `[workly:ai]`:

- `live AI calls enabled` → working
- `request failed 401` → the key is wrong
- `did not return valid JSON` → connected, but the model misbehaved
- nothing at all → the server wasn't restarted, or step 2 was missed

⚠️ **Before you upload anyone's CV but your own:** Google's free API tier
lets Google read what you send and use it for training. Their terms
explicitly say not to send personal information. Turning on billing for
your key moves you to the paid tier, which excludes your data from
training.
