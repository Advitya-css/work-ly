/**
 * ONE-CLICK CAPTURE
 *
 * Most Indian job postings live on LinkedIn and Naukri, which Work-ly
 * cannot (and must not) scrape. What the user CAN do is read them - so the
 * "Save to Work-ly" button runs in the user's own browser, on the page they
 * are already looking at, and does exactly what a copy and paste would:
 * takes the job text they can see and opens Work-ly's analyzer with it.
 *
 * Privacy by construction: the text travels in the URL *fragment*
 * (#capture=...), which browsers never send to any server. Nothing reaches
 * Work-ly until the user reviews the prefilled form and presses Analyze.
 */

export interface CapturedJob {
  title: string;
  company: string;
  text: string;
  url: string;
  site: string;
}

const MAX_TEXT = 15_000;

/** Base64url of UTF-8 JSON. Kept in sync with the encoder inside the bookmarklet below. */
export function encodeCapture(job: CapturedJob): string {
  const json = JSON.stringify({ v: 1, ...job });
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(json, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
}

/**
 * Reads a `#capture=` fragment. Returns null for anything malformed, too
 * short to be a job description, or carrying a non-http(s) link - a crafted
 * link can put anything in a fragment, so nothing is trusted as-is.
 */
export function decodeCapture(hash: string): CapturedJob | null {
  const match = /^#?capture=([A-Za-z0-9_-]+)$/.exec(hash.trim());
  if (!match) return null;
  try {
    const b64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : decodeURIComponent(escape(atob(padded)));
    const raw = JSON.parse(json) as Record<string, unknown>;
    const text = str(raw.text, MAX_TEXT);
    if (text.length < 50) return null;
    const url = str(raw.url, 1500);
    return {
      title: str(raw.title, 200),
      company: str(raw.company, 200),
      text,
      url: /^https?:\/\//i.test(url) ? url : "",
      site: str(raw.site, 100).replace(/^www\./, ""),
    };
  } catch {
    return null;
  }
}

/**
 * The bookmarklet. Plain ES2017 in one line: it has to run as a
 * `javascript:` URL on any site. Selectors cover LinkedIn, Naukri, Indeed,
 * Instahyre, Wellfound and common ATS pages; if the user has selected text,
 * that always wins, and the whole page is the last resort.
 */
export function bookmarkletSource(origin: string): string {
  const code = `(()=>{try{
var S=String(getSelection()||'').trim();
var pick=function(qs,min){for(var i=0;i<qs.length;i++){var e=document.querySelector(qs[i]);if(e&&e.innerText&&e.innerText.trim().length>=min)return e.innerText.trim()}return''};
var T=S.length>200?S:pick(['#job-details','.jobs-description__content','.jobs-description-content__text','.jobs-box__html-content','.show-more-less-html__markup','.description__text','section[class*="job-desc"]','[class*="job-desc"]','[class*="jobDescription"]','[class*="JDC"]','#jobDescriptionText','.job__description','.posting-page .section-wrapper.page-full-width','[data-testid*="description"]','[class*="description"]','article','main'],200);
if(!T)T=document.body.innerText.trim();
var H=pick(['.job-details-jobs-unified-top-card__job-title','.top-card-layout__title','[class*="jd-header-title"]','.posting-headline h2','.job__title h1','h1'],2)||document.title;
var C=pick(['.job-details-jobs-unified-top-card__company-name','.topcard__org-name-link','[class*="jd-header-comp-name"]','[data-testid*="company"]','[class*="company-name"]'],2);
var d=JSON.stringify({v:1,title:H.split('\\n')[0].slice(0,200),company:C.split('\\n')[0].slice(0,200),text:T.slice(0,${MAX_TEXT}),url:location.href.split('#')[0].slice(0,1500),site:location.hostname});
var b=btoa(unescape(encodeURIComponent(d))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
window.open(${JSON.stringify(origin)}+'/analyze-job#capture='+b,'_blank');
}catch(e){alert('Work-ly could not read this page. Select the job description text and click Save to Work-ly again.')}})();`;
  return `javascript:${encodeURIComponent(code.replace(/\n/g, ""))}`;
}
