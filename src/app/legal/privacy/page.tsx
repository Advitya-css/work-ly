export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col gap-6 text-muted-foreground">
      <h1 className="font-serif text-4xl text-foreground mb-4">Privacy Policy</h1>
      <p className="text-sm italic">Last updated: August 31, 2026</p>

      <p>
        Work-ly (work-ly.in) is operated by Advitya Bansal, based in India. Work-ly is used by people around the
        world, so this policy is written to address the EU/UK GDPR, India&apos;s Digital Personal Data Protection
        Act 2023 (DPDPA), the California Consumer Privacy Act (CCPA/CPRA), Canada&apos;s PIPEDA, and Australia&apos;s
        Privacy Act &mdash; whichever applies to you.
      </p>
      <p>
        <strong className="text-foreground">Privacy &amp; grievance contact:</strong>{" "}
        <a href="mailto:advitya@work-ly.in" className="text-foreground underline underline-offset-2">advitya@work-ly.in</a>
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">1. What we collect</h2>
      <p><strong className="text-foreground">Account data:</strong> your name, email, and password (stored as a salted hash) &mdash; or, if you sign in with Google, the basic profile information Google shares.</p>
      <p><strong className="text-foreground">Career data:</strong> your uploaded résumé/CV and its extracted contents, plus anything you add or edit yourself &mdash; work history, education, skills, career goals, and (in Student Mode) visa/work-hour preferences.</p>
      <p><strong className="text-foreground">Application data:</strong> jobs you save, apply to, or track, and any notes you add.</p>
      <p><strong className="text-foreground">Usage &amp; device data:</strong> pages visited, features used, IP address, and similar technical data, used for security (like rate-limiting) and diagnostics.</p>
      <p>
        Please don&apos;t include government ID numbers, payment details, or health information in your résumé or
        notes unless it&apos;s unavoidably part of your work history &mdash; we don&apos;t ask for or want sensitive
        personal data.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">2. How we use it</h2>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li>To create your account, build your career profile, and parse résumés (using local pattern-matching by default; only where you enable an AI-assisted feature is relevant text sent to an AI model provider).</li>
        <li>To show job opportunities and calculate Fit/Priority scores and skills-gap analysis based on your profile.</li>
        <li>To let you save, apply to, and track opportunities, and to generate AI-assisted content you request, like a tailored cover letter.</li>
        <li>To send service-related emails (via our email provider) and secure the service against fraud and abuse.</li>
        <li>To maintain, diagnose, and improve Work-ly, and to comply with legal obligations.</li>
      </ul>
      <p>
        <strong className="text-foreground">We don&apos;t use your career data to serve you third-party ads, and we
        don&apos;t sell your personal information.</strong> If you&apos;re in the EU/UK, we rely on contract
        performance, our legitimate interests (security and improvement), your consent (for optional features), and
        legal obligation as our bases for processing.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">3. Automated scoring &amp; AI features</h2>
      <p>
        Fit/Priority scores and career suggestions are generated automatically from your profile and job data.
        They&apos;re informational only &mdash; no employer receives or relies on a Work-ly score as part of their
        hiring process, and you&apos;re never subject to a solely-automated decision with a legal or similarly
        significant effect on you. You can review, correct, or delete the underlying profile data anytime in
        Settings.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">4. Who we share information with</h2>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li><strong className="text-foreground">Service providers</strong> who process data on our behalf under confidentiality obligations: our cloud hosting/database provider, our email-delivery provider, and, only for AI-assisted features you use, an AI model provider.</li>
        <li><strong className="text-foreground">Job-data providers</strong> (Adzuna, Reed, Remotive, Jobicy, and similar) &mdash; we send search terms to fetch listings, not your résumé or identity.</li>
        <li><strong className="text-foreground">Payments</strong> (once Pro launches) are processed by Lemon Squeezy; we never see or store your card details.</li>
        <li>Legal authorities, where required by law, or in a business transfer such as a merger or acquisition.</li>
      </ul>
      <p><strong className="text-foreground">We do not sell your personal information or share it with data brokers.</strong></p>

      <h2 className="text-2xl font-bold text-foreground mt-4">5. International transfers</h2>
      <p>
        Because Work-ly is operated from India and uses cloud infrastructure providers, your data may be processed
        in India, the United States, or other countries with different data protection laws than your own. Where
        we transfer personal data of EU/UK/EEA users internationally, we rely on appropriate safeguards with our
        service providers.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">6. Retention &amp; deletion</h2>
      <p>
        We keep your data while your account is active. Deleting a résumé, your career data, or your account in
        Settings removes it from active systems immediately; residual backup copies are purged generally within 90
        days, except for the minimum we&apos;re legally required to retain.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">7. Your rights</h2>
      <p>Email <a href="mailto:advitya@work-ly.in" className="text-foreground underline underline-offset-2">advitya@work-ly.in</a> to exercise any of these, or use Settings to delete data directly:</p>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li><strong className="text-foreground">EU/UK (GDPR):</strong> access, correction, deletion, restriction, objection, portability, withdraw consent, and the right to complain to your local supervisory authority.</li>
        <li><strong className="text-foreground">India (DPDPA):</strong> as a Data Principal &mdash; access a summary of your data and how it&apos;s processed, correction and erasure, grievance redressal, and the right to nominate someone to act on your behalf.</li>
        <li><strong className="text-foreground">California (CCPA/CPRA):</strong> know, delete, and correct your personal information, and opt out of &quot;sale&quot; or &quot;sharing&quot; &mdash; we don&apos;t do either, so there&apos;s nothing to opt out of. No discrimination for exercising these rights.</li>
        <li><strong className="text-foreground">Canada (PIPEDA):</strong> access, correction, and withdrawal of consent, and the right to complain to the Office of the Privacy Commissioner of Canada.</li>
        <li><strong className="text-foreground">Australia (Privacy Act):</strong> access and correction, and the right to complain, including to the OAIC.</li>
      </ul>

      <h2 className="text-2xl font-bold text-foreground mt-4">8. Security</h2>
      <p>
        We encrypt data in transit (HTTPS), store your session as an HttpOnly cookie inaccessible to page scripts,
        hash passwords, and enforce per-account isolation so one account can&apos;t reach another&apos;s résumé,
        profile, or applications. No system is 100% secure; if we learn of a breach affecting your data, we&apos;ll
        notify you and any relevant authority as required by law.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">9. Children</h2>
      <p>
        Work-ly isn&apos;t directed at anyone under 18, and we don&apos;t knowingly collect data from anyone under
        18. If we learn we have, we&apos;ll delete it &mdash; contact us if you believe this has happened.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">10. Changes &amp; contact</h2>
      <p>
        We&apos;ll give reasonable notice before any material change to this policy takes effect. Questions or
        requests: <a href="mailto:advitya@work-ly.in" className="text-foreground underline underline-offset-2">advitya@work-ly.in</a>
      </p>
    </div>
  );
}
