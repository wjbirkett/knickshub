export default function TermsPage() {
  const lastUpdated = "March 13, 2026"
  return (
    <div style={{ maxWidth: "800px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426", margin: 0 }}>
          TERMS & CONDITIONS
        </h1>
        <p style={{ color: "#6b7280", margin: "0.25rem 0 0", fontSize: "0.875rem" }}>Last updated: {lastUpdated}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {[
          {
            title: "1. Acceptance of Terms",
            text: "By accessing or using KnicksHub (knickshub.vercel.app), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the site."
          },
          {
            title: "2. For Entertainment Purposes Only",
            text: "All content on KnicksHub — including game predictions, best bets, player prop predictions, and betting analysis — is provided for entertainment and informational purposes only. Nothing on this site constitutes professional sports betting advice. You should never wager more than you can afford to lose."
          },
          {
            title: "3. No Guarantee of Accuracy",
            text: "KnicksHub uses automated AI systems to generate predictions. These predictions may contain errors, outdated information, or inaccuracies. We make no warranty, express or implied, regarding the accuracy, completeness, or reliability of any content on this site."
          },
          {
            title: "4. Affiliate Disclosure",
            text: "KnicksHub may contain affiliate links to third-party sportsbooks and betting platforms. If you click an affiliate link and sign up or make a deposit, KnicksHub may receive a commission. This does not affect the price you pay and does not influence our editorial content."
          },
          {
            title: "5. Age Restriction",
            text: "You must be 21 years of age or older (or the legal gambling age in your jurisdiction) to use this site. Sports betting is illegal in some jurisdictions. It is your responsibility to determine whether sports betting is legal in your location before placing any wagers."
          },
          {
            title: "6. Third-Party Data",
            text: "KnicksHub displays data sourced from ESPN, NBA.com, The Odds API, and other third-party providers. We are not responsible for the accuracy of data provided by these sources. Odds and lines are subject to change and may differ from what is displayed on this site."
          },
          {
            title: "7. Intellectual Property",
            text: "All original content on KnicksHub, including AI-generated articles, site design, and branding, is the property of KnicksHub. You may not reproduce, distribute, or republish content without written permission."
          },
          {
            title: "8. Limitation of Liability",
            text: "KnicksHub and its operators shall not be liable for any financial losses, damages, or harm arising from your use of this site or reliance on any content published here. Use this site at your own risk."
          },
          {
            title: "9. Changes to Terms",
            text: "We reserve the right to update these Terms at any time. Continued use of the site after changes constitutes acceptance of the new Terms."
          },
          {
            title: "10. Contact",
            text: "Questions about these Terms? Contact us via Twitter/X @KnicksHub."
          },
        ].map(({ title, text }) => (
          <div key={title} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.1rem", letterSpacing: "0.08em", color: "#F58426", margin: "0 0 0.6rem" }}>{title}</h2>
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", lineHeight: 1.7, margin: 0 }}>{text}</p>
          </div>
        ))}

        {/* Responsible Gambling Banner */}
        <div style={{ background: "#0d1117", border: "1px solid #374151", borderRadius: "0.75rem", padding: "1.25rem", textAlign: "center" }}>
          <p style={{ color: "#fbbf24", fontSize: "0.8rem", fontWeight: 700, margin: "0 0 0.4rem", letterSpacing: "0.05em" }}>
            🎰 GAMBLE RESPONSIBLY
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: 0 }}>
            If gambling is affecting you or someone you know, call the National Problem Gambling Helpline:{" "}
            <a href="tel:18005224700" style={{ color: "#F58426", fontWeight: 700 }}>1-800-522-4700</a>
          </p>
        </div>
      </div>
    </div>
  )
}
