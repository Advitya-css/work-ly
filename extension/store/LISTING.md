# Chrome Web Store listing

Everything the developer dashboard asks for, in the order it asks. Paste
each block into the field it names. The screenshots and the promo tile are
in this folder; the zip to upload is built from the extension folder (see
the end of this file).

## Store listing tab

**Item name** (from the manifest, can't be edited here)

    Work-ly: Should I apply?

**Summary** (from the manifest, 125 of 132 characters)

    Reads the job posting you are looking at and opens Work-ly's answer: apply, stretch or skip, checked against your own resume.

**Description**

    One question on every job posting: should I apply?

    Open a job on a site Work-ly supports and a small panel appears in the corner with the title, the employer and one button. Press it and Work-ly opens with the posting already filled in. You get a straight answer, apply, stretch or skip, with the line from your own resume behind every requirement, or what's missing and how to close it.

    If it's worth applying, Work-ly can write the application for that one job from your real experience: a tailored resume, a cover letter, a note to the hiring manager and interview prep. Nothing is invented.

    Private by design
    - The extension collects nothing and sends nothing by itself.
    - When you press the button, the posting travels to Work-ly in the link's fragment, which browsers never send to a server. Nothing reaches Work-ly until you look at the filled-in form and press Analyze.
    - No analytics, no tracking, no access to any other site.

    Works on job postings on LinkedIn, Naukri, Indeed, Instahyre and Wellfound, and on company job pages hosted by Greenhouse, Lever, Ashby and Workday. If a page isn't recognised, select the job description and the panel uses your selection.

    You need a free Work-ly account to get the answer. Work-ly is not affiliated with any of the sites above.

**Category:** Productivity

**Language:** English

**Graphic assets**

- Store icon: `icons/icon-128.png` (already in the zip; upload it here too if asked)
- Screenshots (1280x800), in this order:
  1. `screenshot-1-the-button.png`: the panel on a job posting
  2. `screenshot-2-filled-in.png`: Work-ly opened with the posting filled in
  3. `screenshot-3-the-answer.png`: the answer
- Small promo tile (440x280): `promo-tile-440x280.png`

**Additional fields**

- Official URL / Homepage URL: `https://work-ly.in`
- Support URL: `https://work-ly.in`

## Privacy practices tab

**Single purpose**

    Shows a "Should I apply?" button on job postings and, when the user presses it, opens their Work-ly account with that posting filled in so they can check it against their resume.

**Permission justification: storage**

    Remembers one setting: which Work-ly address the button opens (work-ly.in by default).

**Host permission justification** (the job sites in content_scripts)

    The content script runs only on job pages of the listed job sites. It reads the posting the user is viewing to show the button and fill in Work-ly when the user presses it. It makes no network requests.

**Are you using remote code?** No.

**Data usage.** Tick **Website content**: the posting on the page is passed to Work-ly when the user presses the button. Tick nothing else. Then tick all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `https://work-ly.in/legal/privacy` (it describes the extension in section 1)

## Distribution tab

- Visibility: Public
- Regions: All regions

## Building the zip

From the repository root:

    cd extension && zip -r store/workly-extension-$(node -p "require('./manifest.json').version").zip manifest.json background.js content.js extract.js popup.html popup.js icons

Only those files go in: never the `test/` or `store/` folders. Raise `version` in `manifest.json` before every upload after the first; the store refuses a version it has already seen.
