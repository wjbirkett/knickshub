import { Helmet } from "react-helmet-async"

const S = {
  bg: "#131313", surface: "#1c1b1b", border: "rgba(255,255,255,0.08)",
  orange: "#F58426", peach: "#ffb786", text: "#e5e2e1", textMuted: "#ddc1b1",
}

export default function PrivacyPage() {
  return (
    <div className="main-content" style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet><title>Privacy Policy | KnicksHub</title></Helmet>
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem" }}>
        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: 0, fontStyle: "italic" }}>Privacy <span style={{ color: S.peach }}>Policy</span></h1>
      </div>
      <div style={{ padding: "3rem 2.5rem", maxWidth: "800px", color: S.textMuted, fontFamily: "Inter, sans-serif", lineHeight: 1.75, fontSize: "0.9375rem" }}>
        <p>KnicksHub collects minimal data necessary to operate the site. We use Google Analytics (GA4) to track anonymous page views and user behavior. We do not sell personal data. We do not collect payment information. Cookies may be used for analytics purposes. By using this site you consent to these practices.</p>
        <p style={{ marginTop: "1.5rem" }}><strong style={{ color: S.text }}>Affiliate Disclosure:</strong> KnicksHub may earn commissions from DraftKings and FanDuel affiliate links. This does not influence our picks or analysis.</p>
        <p style={{ marginTop: "1.5rem" }}><strong style={{ color: S.text }}>Contact:</strong> For privacy concerns, contact us via our social channels.</p>
      </div>
    </div>
  )
}
