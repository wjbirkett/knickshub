

export default function AboutPage() {
  return (
    <div style={{ maxWidth: "800px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426", margin: 0 }}>
          ABOUT KNICKSHUB
        </h1>
        <p style={{ color: "#6b7280", margin: "0.25rem 0 0", fontSize: "0.875rem" }}>Who we are and how it works.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Who We Are */}
        <Section title="Who We Are">
          <p style={body}>
            KnicksHub is an independent New York Knicks fan site built for fans and sports bettors who want everything in one place — real-time stats, injury reports, betting lines, and daily AI-powered game predictions.
          </p>
          <p style={body}>
            The site is run by <strong style={{ color: "#f9fafb" }}>Nick Knicks</strong>, a lifelong Knicks fan and sports data enthusiast based in Connecticut. KnicksHub is not affiliated with the New York Knicks, the NBA, or any sportsbook.
          </p>
        </Section>

        {/* How Predictions Work */}
        <Section title="How Predictions Work">
          <p style={body}>
            Every game day, KnicksHub automatically generates three types of articles:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "0.75rem 0" }}>
            {[
              { badge: "PREDICTION", bg: "#0c1a4b", color: "#93c5fd", desc: "A full game preview covering matchup analysis, recent form, injuries, and a final score prediction." },
              { badge: "BEST BET", bg: "#14532d", color: "#86efac", desc: "A focused betting recommendation identifying the single strongest wagering opportunity for the game." },
              { badge: "PROP BET", bg: "#4a1d1d", color: "#fca5a5", desc: "A player prop prediction analyzing a key Knicks player's statistical likelihood against their line." },
            ].map(item => (
              <div key={item.badge} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", background: "#0d1117", borderRadius: "0.5rem", padding: "0.875rem" }}>
                <span style={{ background: item.bg, color: item.color, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", padding: "0.2rem 0.6rem", borderRadius: "999px", flexShrink: 0, marginTop: "0.1rem" }}>
                  {item.badge}
                </span>
                <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <p style={body}>
            Articles are generated using <strong style={{ color: "#f9fafb" }}>Claude by Anthropic</strong>, a large language model, enriched with real-time data from multiple sources. All predictions are generated automatically — no human edits articles before they are published.
          </p>
        </Section>

        {/* Data Sources */}
        <Section title="Data Sources">
          <p style={body}>KnicksHub pulls live data from the following sources:</p>
          <div style={{ marginTop: "0.75rem" }}>
            {[
              ["News & Injuries", "ESPN API"],
              ["Schedule & Results", "ESPN API"],
              ["Player Statistics", "NBA.com via nba_api"],
              ["Betting Lines & Odds", "The Odds API v4"],
              ["AI Article Generation", "Anthropic Claude"],
            ].map(([label, source]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #1f2937" }}>
                <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>{label}</span>
                <span style={{ color: "#f9fafb", fontSize: "0.875rem", fontWeight: 600 }}>{source}</span>
              </div>
            ))}
          </div>
          <p style={{ ...body, marginTop: "0.75rem" }}>
            Odds and injury data are refreshed automatically throughout the day. Articles are generated 45 minutes before game time.
          </p>
        </Section>

        {/* Disclaimer */}
        <Section title="Editorial Disclaimer">
          <p style={body}>
            All predictions, picks, and analysis on KnicksHub are for <strong style={{ color: "#f9fafb" }}>entertainment and informational purposes only</strong>. They do not constitute professional sports betting advice.
          </p>
          <p style={body}>
            Past performance of predictions does not guarantee future results. KnicksHub does not track or publish a running record of prediction accuracy.
          </p>
          <p style={body}>
            KnicksHub may contain affiliate links to sportsbooks. If you click a link and create an account, we may receive a commission at no cost to you. This does not influence our editorial content.
          </p>
        </Section>

        {/* Responsible Gambling */}
        <Section title="Responsible Gambling">
          <p style={body}>
            Sports betting should be fun. If you or someone you know is struggling with problem gambling, free confidential help is available:
          </p>
          <div style={{ background: "#0d1117", border: "1px solid #374151", borderRadius: "0.75rem", padding: "1rem", marginTop: "0.75rem" }}>
            {[
              ["National Problem Gambling Helpline", "1-800-522-4700", "https://www.ncpgambling.org"],
              ["Connecticut Problem Gambling Services", "1-888-789-7777", "https://portal.ct.gov/DMHAS/Programs-and-Services/Gambling"],
              ["Crisis Text Line", "Text HOME to 741741", "https://www.crisistextline.org"],
            ].map(([name, contact, url]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid #1f2937", flexWrap: "wrap", gap: "0.25rem" }}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#006BB6", fontSize: "0.875rem", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F58426")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#006BB6")}
                >{name}</a>
                <span style={{ color: "#f9fafb", fontSize: "0.875rem", fontWeight: 600 }}>{contact}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact">
          <p style={body}>
            Questions, corrections, or feedback? KnicksHub is a solo project — the best way to reach us is via Twitter/X{" "}
            <a href="https://twitter.com/knicks_hub" target="_blank" rel="noopener noreferrer" style={{ color: "#006BB6" }}>@knicks_hub</a>.
          </p>
        </Section>

      </div>
    </div>
  )
}

const body: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "0.9rem",
  lineHeight: 1.7,
  margin: "0 0 0.75rem",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", padding: "1.5rem" }}>
      <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.3rem", letterSpacing: "0.1em", color: "#F58426", margin: "0 0 1rem" }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
