export default function PrivacyPage() {
    const lastUpdated = "March 13, 2026";
    return (<div style={{ maxWidth: "800px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426", margin: 0 }}>
          PRIVACY POLICY
        </h1>
        <p style={{ color: "#6b7280", margin: "0.25rem 0 0", fontSize: "0.875rem" }}>Last updated: {lastUpdated}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {[
            {
                title: "1. Overview",
                text: "KnicksHub (knickshub.vercel.app) is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights. By using this site, you agree to this policy."
            },
            {
                title: "2. Data We Collect",
                text: "KnicksHub does not require you to create an account or submit any personal information to use the site. We collect anonymized usage data via Google Analytics 4 (GA4), including pages visited, time on site, device type, and approximate geographic location (country/region level). We do not collect names, email addresses, or payment information directly."
            },
            {
                title: "3. Google Analytics",
                text: "We use Google Analytics 4 to understand how visitors use the site. GA4 collects anonymized data such as page views, session duration, and traffic sources. This data is aggregated and cannot be used to identify you personally. You can opt out of GA4 tracking by using the Google Analytics Opt-out Browser Add-on (tools.google.com/dlpage/gaoptout)."
            },
            {
                title: "4. Cookies",
                text: "KnicksHub uses cookies primarily through Google Analytics. These are analytics cookies that help us understand site usage. We do not use advertising cookies or sell data to third parties. You can disable cookies in your browser settings, though this may affect site functionality."
            },
            {
                title: "5. Affiliate Links",
                text: "This site may contain affiliate links to third-party sportsbooks. When you click an affiliate link, you will be redirected to a third-party site. We do not control the privacy practices of these third parties and encourage you to review their privacy policies before providing any personal information."
            },
            {
                title: "6. Third-Party Services",
                text: "KnicksHub uses the following third-party services that may process data: Google Analytics (analytics), Vercel (hosting), Railway (backend hosting), Supabase (database). Each of these services operates under its own privacy policy."
            },
            {
                title: "7. Data Retention",
                text: "We do not store personal user data. Analytics data collected by Google Analytics is retained according to Google's standard data retention policies (default 14 months)."
            },
            {
                title: "8. Children's Privacy",
                text: "KnicksHub is not intended for users under the age of 21. We do not knowingly collect data from minors. If you believe a minor has provided information to this site, please contact us."
            },
            {
                title: "9. Changes to This Policy",
                text: "We may update this Privacy Policy from time to time. The date at the top of this page reflects the most recent update. Continued use of the site after changes constitutes acceptance."
            },
            {
                title: "10. Contact",
                text: "Questions about this Privacy Policy? Contact us via Twitter/X @KnicksHub."
            },
        ].map(({ title, text }) => (<div key={title} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.1rem", letterSpacing: "0.08em", color: "#F58426", margin: "0 0 0.6rem" }}>{title}</h2>
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", lineHeight: 1.7, margin: 0 }}>{text}</p>
          </div>))}
      </div>
    </div>);
}
