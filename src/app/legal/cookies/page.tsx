export default function CookiePolicy() {
  return (
    <div className="flex flex-col gap-6 text-muted-foreground">
      <h1 className="font-serif text-4xl text-foreground mb-4">Cookie Policy</h1>
      <p className="text-sm italic">Last updated: August 31, 2026</p>

      <p>
        This Cookie Policy explains how Work-ly (work-ly.in) uses cookies and similar technologies. Read it together
        with our <a href="/legal/privacy" className="text-foreground underline underline-offset-2">Privacy Policy</a>.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">1. What are cookies?</h2>
      <p>
        Cookies are small text files placed on your device when you visit a website, used to make sites work, keep
        you signed in, and sometimes to track activity across other sites.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">2. What we use</h2>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li>
          <strong className="text-foreground">Strictly necessary:</strong> a session cookie that keeps you signed
          in, set as HttpOnly (not readable by page scripts) and Secure (HTTPS only). Essential &mdash; disabling it
          will prevent you from signing in or using most of Work-ly.
        </li>
        <li>
          <strong className="text-foreground">Analytics:</strong> we use Vercel Analytics to understand aggregate
          traffic and performance. It&apos;s designed to be privacy-friendly and does not use tracking cookies or
          collect personally identifiable information.
        </li>
        <li>
          <strong className="text-foreground">Payments (once Pro launches):</strong> our payment provider, Lemon
          Squeezy, may set its own cookies during checkout to process a subscription. We don&apos;t control these
          directly &mdash; see Lemon Squeezy&apos;s own privacy and cookie policy.
        </li>
      </ul>
      <p>
        <strong className="text-foreground">We don&apos;t use third-party advertising or cross-site tracking
        cookies</strong>, and we don&apos;t sell or share data with ad networks.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">3. Your choices</h2>
      <p>
        The strictly necessary cookie can&apos;t be disabled without breaking sign-in, since it&apos;s what makes
        your session possible. You can control other cookies through your browser settings &mdash; to view, block,
        or delete them &mdash; and where legally required (for example, for EU/UK visitors), we&apos;ll add an
        on-site consent option before setting any future non-essential cookie beyond what&apos;s described here.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">4. Changes &amp; contact</h2>
      <p>
        We&apos;ll update this policy if the cookies or technologies we use change. Questions:{" "}
        <a href="mailto:advitya@work-ly.in" className="text-foreground underline underline-offset-2">advitya@work-ly.in</a>
      </p>
    </div>
  );
}
