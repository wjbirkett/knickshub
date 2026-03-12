import TwitterFeed from "../components/TwitterFeed"
import { useState } from "react"

const ACCOUNTS = [
  { handle: "nyknicks",         label: "NY Knicks (Official)" },
  { handle: "KristianWinfield", label: "Kristian Winfield" },
  { handle: "IanBegley",        label: "Ian Begley" },
  { handle: "FredKatz",         label: "Fred Katz" },
  { handle: "SBondyNYDN",       label: "Stefan Bondy" },
]

export default function TweetsPage() {
  const [active, setActive] = useState("nyknicks")
  const H1 = { fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426" }

  return (
    <div style={{ maxWidth: "700px" }}>
      <header style={{ borderBottom: "1px solid #1f2937", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={H1}>TWEETS</h1>
        <p style={{ color: "#6b7280", margin: 0, fontSize: "0.875rem" }}>Live feeds from the Knicks and beat writers</p>
      </header>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {ACCOUNTS.map(a => (
          <button key={a.handle} onClick={() => setActive(a.handle)} style={{
            padding: "0.35rem 1rem", borderRadius: "999px", border: "1px solid",
            fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
            background: active === a.handle ? "#F58426" : "transparent",
            borderColor: active === a.handle ? "#F58426" : "#374151",
            color: active === a.handle ? "#000" : "#9ca3af",
          }}>
            {a.label}
          </button>
        ))}
      </div>

      <TwitterFeed key={active} handle={active} height={700} />

      <p style={{ color: "#374151", fontSize: "0.75rem", marginTop: "1rem", textAlign: "center" }}>
        Note: Twitter feeds may show a rate limit error on localhost. Will work correctly once deployed.
      </p>
    </div>
  )
}
