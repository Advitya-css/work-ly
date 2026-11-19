# Work-ly for Chrome

A panel on the job posting you are already reading, with one question on it.

Press it and Work-ly's analyzer opens with the posting filled in: the
verdict (apply, stretch or skip), which of the must-haves you meet, and the
line from your own resume that proves each one.

## What it reads, and what it sends

It reads the posting the way you would: the schema.org `JobPosting` block
the site embeds for Google Jobs, falling back to the page's own markup, and
to whatever you have selected if you selected something long enough to be a
description. Structured data first, because it survives redesigns and
selectors do not.

Nothing is sent anywhere. The posting travels to Work-ly in the URL
fragment, which browsers never transmit to a server, so the text does not
leave your machine until you look at the prefilled form and press Analyze.
The extension asks for no host permissions beyond the job sites it runs on,
makes no network requests of its own, and has no analytics in it.

## Sites

LinkedIn, Naukri, Indeed (.com and .co.in), Instahyre, Wellfound, and
postings hosted on Greenhouse, Lever, Ashby and Workday.

## Running it before it is published

1. Open `chrome://extensions` and turn on **Developer mode**.
2. **Load unpacked**, and choose this `extension/` folder.
3. Open any job posting from the list above.

To point it at a local Work-ly, open the extension's service worker console
from `chrome://extensions` and run:

    chrome.storage.sync.set({ origin: "http://localhost:3000" })

## Tests

    node extension/test/run.cjs

Loads the real extension into Chromium and drives it against saved pages:
one carrying a `JobPosting` block and nothing else useful, one with no
structured data, one that is not a posting at all. It checks the panel
appears where it should, stays away where it should not, is sealed inside
its shadow root so neither stylesheet can reach the other, and that the link
the button produces decodes back to the posting using Work-ly's own
`decodeCapture`.

The fixtures are hand-written in the shape real postings come in. Nothing
is scraped, and the tests make no network calls.

## Publishing

The Chrome Web Store takes a one-time $5 developer fee and reviews new
listings, usually within a few days. Zip the contents of this folder (not
the folder itself) and upload it. A listing needs a 128px icon, which is in
`icons/`, at least one 1280x800 screenshot, and a privacy disclosure: this
extension collects nothing, which is the easiest version of that form to
fill in. Firefox and Edge take the same code as separate listings.

Bump `version` in `manifest.json` for every upload; the store rejects a
repeat.
