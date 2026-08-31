export default function TermsOfService() {
  return (
    <div className="flex flex-col gap-6 text-muted-foreground">
      <h1 className="font-serif text-4xl text-foreground mb-4">Terms of Service</h1>
      <p className="text-sm italic">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

      <p>
        Welcome to Workly. By accessing or using our website, platform, and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
      </p>

      <div className="border-l-4 border-warning pl-4 py-1 my-4 bg-warning/10 text-warning-foreground text-sm">
        <p className="font-semibold mb-1">Disclaimer</p>
        <p>This is a generic boilerplate Terms of Service document provided for demonstration purposes. You should consult with a legal professional to ensure your terms are legally compliant for your specific jurisdiction and business operations.</p>
      </div>

      <h2 className="text-2xl font-bold text-foreground mt-4">1. Description of Service</h2>
      <p>
        Workly is an AI-powered career intelligence platform designed to help users match their skills with job opportunities, analyze gaps, and tailor applications. We aggregate public job listings and use artificial intelligence to provide recommendations.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">2. Account Registration</h2>
      <p>
        You must register an account to access certain features. You agree to provide accurate, current, and complete information during the registration process and to keep your account information updated. You are responsible for safeguarding your password and for all activities that occur under your account.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">3. Pro and Payment Terms</h2>
      <p>
        Certain features are locked behind a "Workly Pro" subscription. By choosing to upgrade to Pro, you agree to pay the fees associated with the subscription. Payments are processed securely via our merchant of record, Lemon Squeezy. All fees are non-refundable unless required by law.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li>Reverse engineer, decompile, or disassemble any aspect of the Workly platform.</li>
        <li>Automate access to the service (e.g., scraping, bots) without explicit written permission.</li>
        <li>Use the service to generate false, misleading, or fraudulent job applications.</li>
        <li>Attempt to bypass or exploit our rate limits, security measures, or payment gateways.</li>
      </ul>

      <h2 className="text-2xl font-bold text-foreground mt-4">5. Disclaimer of Warranties; AI Limitations</h2>
      <p>
        Workly heavily relies on third-party Artificial Intelligence (AI) to generate analysis, fit scores, and application materials. AI can produce inaccurate, incomplete, or inappropriate outputs ("hallucinations"). You are solely responsible for reviewing and verifying any AI-generated content before using it in your career search.
      </p>
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. WE DO NOT GUARANTEE THAT YOU WILL RECEIVE JOB OFFERS, INTERVIEWS, OR EMPLOYMENT AS A RESULT OF USING THE SERVICE.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">6. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Workly shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the service.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">7. Changes to Terms</h2>
      <p>
        We may modify these Terms at any time. If we make material changes, we will notify you by updating the date at the top of this page and potentially via email or in-app notification. Your continued use of the service constitutes acceptance of the revised Terms.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">8. Contact Information</h2>
      <p>
        For legal inquiries regarding these terms, please contact legal@workly.com.
      </p>
    </div>
  );
}
