export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col gap-6 text-muted-foreground">
      <h1 className="font-serif text-4xl text-foreground mb-4">Privacy Policy</h1>
      <p className="text-sm italic">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

      <p>
        At Workly, we prioritize the protection of your personal information and career data. 
        This Privacy Policy explains how we collect, use, and share information when you use our platform.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">1. Information We Collect</h2>
      <p>
        <strong>Account Data:</strong> When you create an account, we collect your email address, name, and basic authentication details.
      </p>
      <p>
        <strong>Career Data:</strong> To provide our matching and analysis features, we collect the career information you provide, including your uploaded resumes (PDF/DOCX), LinkedIn profile URLs, manually entered skills, experience, and educational background.
      </p>
      <p>
        <strong>Usage Data:</strong> We automatically collect information about how you interact with Workly, including search queries, saved opportunities, and IP addresses for security and rate-limiting purposes.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">2. How We Use Your Information</h2>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li><strong>AI Analysis:</strong> Your career data is processed using advanced language models to match you with job opportunities, identify skill gaps, and tailor applications.</li>
        <li><strong>Service Provision:</strong> To create and manage your account, process payments (via Lemon Squeezy), and provide our core features.</li>
        <li><strong>Improvement:</strong> To monitor system performance, identify bugs, and improve the accuracy of our matching engine.</li>
      </ul>

      <h2 className="text-2xl font-bold text-foreground mt-4">3. Third-Party Services & Subprocessors</h2>
      <p>
        We do not sell your personal data. We share necessary data with trusted third parties strictly to operate our service:
      </p>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li><strong>AI Providers:</strong> We use external API providers (such as OpenAI or Anthropic) to process your resume and job descriptions. Your data is sent securely and is <strong>not</strong> used by these providers to train their foundational models under our enterprise agreements.</li>
        <li><strong>Job Sources:</strong> We fetch job listings from public APIs (e.g., Adzuna, The Muse, Remote OK). We do not send your personal data to these job boards unless you explicitly choose to apply through their platforms.</li>
        <li><strong>Payments:</strong> All payments are processed by Lemon Squeezy. We do not store your credit card information.</li>
      </ul>

      <h2 className="text-2xl font-bold text-foreground mt-4">4. Data Retention and Deletion</h2>
      <p>
        We retain your data only as long as your account is active. You may request the deletion of your account and all associated data at any time by contacting our support team or deleting your account from the settings page. Upon deletion, your data is permanently removed from our active databases.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">5. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us at privacy@workly.com.
      </p>
    </div>
  );
}
