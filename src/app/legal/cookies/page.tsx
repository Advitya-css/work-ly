export default function CookiePolicy() {
  return (
    <div className="flex flex-col gap-6 text-muted-foreground">
      <h1 className="font-serif text-4xl text-foreground mb-4">Cookie Policy</h1>
      <p className="text-sm italic">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

      <p>
        This Cookie Policy explains how Workly uses cookies and similar tracking technologies when you visit our platform. By continuing to browse or use our services, you agree to our use of cookies as described in this policy.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">1. What are cookies?</h2>
      <p>
        Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work efficiently, securely, and to provide information to the owners of the site.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">2. How we use cookies</h2>
      <p>We use cookies for the following essential purposes:</p>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li>
          <strong>Authentication & Security:</strong> We use securely signed HTTP-only cookies to keep you logged in and to protect your account from unauthorized access. These are strictly necessary for the application to function.
        </li>
        <li>
          <strong>Preferences:</strong> We use local storage (similar to cookies) to remember your UI preferences, such as your chosen theme (dark/light mode).
        </li>
      </ul>

      <h2 className="text-2xl font-bold text-foreground mt-4">3. Third-party cookies</h2>
      <p>
        We strive to keep our platform fast and privacy-friendly. We use basic analytics (such as Vercel Analytics) to measure traffic and performance, which may set functional cookies. Additionally, our payment provider (Lemon Squeezy) may set cookies when you interact with the checkout process to complete a transaction.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">4. Managing your cookies</h2>
      <p>
        You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies. However, if you choose to reject cookies, you may not be able to log in to Workly, as authentication cookies are strictly required for the platform to function.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">5. Updates to this policy</h2>
      <p>
        We may update this Cookie Policy from time to time to reflect changes to the cookies we use or for other operational, legal, or regulatory reasons. Please revisit this page regularly to stay informed about our use of cookies.
      </p>

      <h2 className="text-2xl font-bold text-foreground mt-4">6. Contact us</h2>
      <p>
        If you have questions about our use of cookies, you can contact us at privacy@workly.com.
      </p>
    </div>
  );
}
