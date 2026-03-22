import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getOdds, getSchedule } from "../utils/api";
const S = {
    bg: "#131313", surface: "#1c1b1b", surfaceHigh: "#2a2a2a",
    surfaceHighest: "#353534", border: "rgba(255,255,255,0.08)",
    orange: "#F58426", peach: "#ffb786", green: "#4ae176",
    greenBg: "#06bb55", red: "#ffb4ab", redBg: "#93000a",
    text: "#e5e2e1", textMuted: "#ddc1b1",
};
export default function OddsPage() {
    const { data: odds, isLoading } = useQuery({ queryKey: ["odds"], queryFn: getOdds, refetchInterval: 60000 });
    const { data: schedule } = useQuery({ queryKey: ["schedule"], queryFn: getSchedule });
    const line = odds?.[0];
    const nextGame = schedule?.find((g) => g.status !== "Final");
    const isKnicksHome = line?.home_team?.includes("Knicks") || line?.home_team?.includes("New York");
    const knicksSpread = line?.spread != null ? (isKnicksHome ? line.spread : -line.spread) : null;
    const knicksMl = isKnicksHome ? line?.moneyline_home : line?.moneyline_away;
    const oppMl = isKnicksHome ? line?.moneyline_away : line?.moneyline_home;
    const opp = isKnicksHome ? line?.away_team : line?.home_team;
    const fmt = (ml) => ml > 0 ? `+${ml}` : `${ml}`;
    const fmtSpread = (s) => s > 0 ? `+${s.toFixed(1)}` : `${s.toFixed(1)}`;
    const gameDate = nextGame?.game_date ? new Date(nextGame.game_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase() : "";
    return (<div className="main-content" style={{ background: S.bg, minHeight: "100vh" }}>
      <Helmet>
        <title>Knicks Odds & Betting Lines | KnicksHub</title>
        <meta name="description" content="Live New York Knicks betting odds — spread, moneyline, and over/under for the next game."/>
        <link rel="canonical" href="https://knickshub.com/odds"/>
      </Helmet>

      {/* Header */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: "2rem 2.5rem" }}>
        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", color: S.text, margin: "0 0 0.5rem", fontStyle: "italic" }}>
          Live <span style={{ color: S.peach }}>Odds</span>
        </h1>
        <p style={{ color: S.textMuted, fontSize: "0.875rem", margin: 0 }}>Live betting lines for the next Knicks game — updates every minute</p>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "800px" }}>
        {isLoading ? (<p style={{ color: S.textMuted, fontFamily: "Space Grotesk, sans-serif" }}>Loading odds...</p>) : !line ? (<div style={{ background: S.surface, border: `1px solid ${S.border}`, padding: "3rem", textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: S.textMuted, display: "block", marginBottom: "1rem" }}>sports_basketball</span>
            <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "1.125rem", color: S.text, textTransform: "uppercase", marginBottom: "0.5rem" }}>No Lines Available Yet</p>
            <p style={{ color: S.textMuted, fontSize: "0.875rem" }}>Odds typically appear a few hours before tip-off. Check back closer to game time.</p>
            {nextGame && <p style={{ color: S.orange, fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "1rem", fontFamily: "Space Grotesk, sans-serif" }}>Next: Knicks vs {nextGame.home_team?.includes("Knicks") ? nextGame.away_team : nextGame.home_team} · {gameDate}</p>}
          </div>) : (<>
            {/* Game header */}
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: S.orange, margin: "0 0 0.5rem" }}>{gameDate}</p>
              <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem, 3vw, 2.5rem)", textTransform: "uppercase", letterSpacing: "-0.02em", color: S.text, margin: 0 }}>
                Knicks vs <span style={{ color: S.peach }}>{opp?.split(" ").pop()}</span>
              </h2>
              <p style={{ fontSize: "0.625rem", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "0.25rem" }}>Via {line.bookmaker} · Live</p>
            </div>

            {/* Odds cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
              {/* Spread */}
              <div style={{ background: S.surface, border: `1px solid ${S.border}`, padding: "1.5rem", textAlign: "center" }}>
                <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, marginBottom: "0.75rem" }}>Spread</p>
                {knicksSpread != null ? (<>
                    <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "2.5rem", color: knicksSpread < 0 ? S.green : S.peach, lineHeight: 1, marginBottom: "0.5rem" }}>{fmtSpread(knicksSpread)}</p>
                    <p style={{ fontSize: "0.625rem", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, textTransform: "uppercase" }}>Knicks {knicksSpread < 0 ? "Favored" : "Underdog"}</p>
                  </>) : <p style={{ color: S.textMuted, fontFamily: "Space Grotesk, sans-serif" }}>N/A</p>}
              </div>

              {/* Total */}
              <div style={{ background: S.surface, border: `1px solid ${S.border}`, padding: "1.5rem", textAlign: "center" }}>
                <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, marginBottom: "0.75rem" }}>Total (O/U)</p>
                {line.over_under != null ? (<>
                    <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "2.5rem", color: S.text, lineHeight: 1, marginBottom: "0.5rem" }}>{line.over_under}</p>
                    <p style={{ fontSize: "0.625rem", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, textTransform: "uppercase" }}>Points Total</p>
                  </>) : <p style={{ color: S.textMuted, fontFamily: "Space Grotesk, sans-serif" }}>N/A</p>}
              </div>

              {/* Moneyline */}
              <div style={{ background: S.surface, border: `1px solid ${S.border}`, padding: "1.5rem", textAlign: "center" }}>
                <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: S.textMuted, marginBottom: "0.75rem" }}>Moneyline</p>
                {knicksMl != null ? (<>
                    <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "2.5rem", color: knicksMl < 0 ? S.green : S.peach, lineHeight: 1, marginBottom: "0.5rem" }}>{fmt(knicksMl)}</p>
                    <p style={{ fontSize: "0.625rem", color: S.textMuted, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, textTransform: "uppercase" }}>Knicks ML</p>
                  </>) : <p style={{ color: S.textMuted, fontFamily: "Space Grotesk, sans-serif" }}>N/A</p>}
              </div>
            </div>

            {/* Opponent ML */}
            {oppMl != null && (<div style={{ background: S.surface, border: `1px solid ${S.border}`, padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.875rem", color: S.textMuted, textTransform: "uppercase" }}>{opp} Moneyline</span>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 900, fontSize: "1.25rem", color: oppMl < 0 ? S.green : S.peach }}>{fmt(oppMl)}</span>
              </div>)}

            {/* Disclaimer */}
            <p style={{ fontSize: "0.625rem", color: S.textMuted, opacity: 0.5, fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
              Odds sourced from ESPN/DraftKings. Lines subject to change. Please gamble responsibly. If you or someone you know has a gambling problem, call 1-888-789-7777.
            </p>

            {/* Link to articles */}
            <div style={{ marginTop: "2rem" }}>
              <Link to="/predictions" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: S.orange, textDecoration: "none" }}>
                View AI Predictions <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>north_east</span>
              </Link>
            </div>
          </>)}
      </div>
    </div>);
}
