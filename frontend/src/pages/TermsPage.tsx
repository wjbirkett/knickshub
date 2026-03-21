import { Helmet } from "react-helmet-async"

const S = {
  bg: "#131313", surface: "#1c1b1b", border: "rgba(255,255,255,0.08)",
  orange: "#F58426", peach: "#ffb786", text: "#e5e2e1", textMuted: "#ddc1b1",
}

export default function TermsPage() {
  return (
    <div style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet><title>Terms of Service | KnicksHub</title></Helmet>
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem" }}>
        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: 0, fontStyle: "italic" }}>Terms of <span style={{ color: S.peach }}>Service</span></h1>
      </div>
      <div style={{ padding: "3rem 2.5rem", maxWidth: "800px", color: S.textMuted, fontFamily: "Inter, sans-serif", lineHeight: 1.75, fontSize: "0.9375rem" }}>
        <p>By using KnicksHub, you agree to these terms. Content is for informational and entertainment purposes only and does not constitute financial or gambling advice. KnicksHub is not responsible for any losses incurred from betting decisions. Must be 21+ and located in a jurisdiction where sports betting is legal. KnicksHub is not affiliated with the NBA or the New York Knicks organization. We reserve the right to modify these terms at any time.</p>
        <p style={{ marginTop: "1.5rem" }}><strong style={{ color: S.text }}>Responsible Gambling:</strong> If you or someone you know has a gambling problem, call 1-800-522-4700 (National) or 1-888-789-7777 (Connecticut).</p>
      </div>
    </div>
  )
}
