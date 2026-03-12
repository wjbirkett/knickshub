import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getStats } from "../utils/api"

type SortKey = "points_per_game" | "rebounds_per_game" | "assists_per_game" | "field_goal_pct" | "three_point_pct" | "minutes_per_game"

export default function StatsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["stats"], queryFn: getStats })
  const [sort, setSort] = useState<SortKey>("points_per_game")
  const H1 = { fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426" }

  const sorted = [...(data ?? [])].sort((a: any, b: any) => b[sort] - a[sort])

  const COLS: { key: SortKey; label: string }[] = [
    { key: "points_per_game",   label: "PTS" },
    { key: "rebounds_per_game", label: "REB" },
    { key: "assists_per_game",  label: "AST" },
    { key: "field_goal_pct",    label: "FG%" },
    { key: "three_point_pct",   label: "3P%" },
    { key: "minutes_per_game",  label: "MIN" },
  ]

  return (
    <div style={{ maxWidth: "900px" }}>
      <header style={{ borderBottom: "1px solid #1f2937", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={H1}>PLAYER STATS</h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>2024-25 season — click a column to sort</p>
      </header>

      {isLoading && <p style={{ color: "#6b7280" }}>Loading stats...</p>}

      {data && data.length === 0 && (
        <p style={{ color: "#6b7280" }}>Stats unavailable — stats.nba.com may be rate limiting. Try again in a minute.</p>
      )}

      {sorted.length > 0 && (
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#0d0d0d" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#6b7280", fontWeight: 600 }}>Player</th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: "#6b7280" }}>GP</th>
                {COLS.map(c => (
                  <th key={c.key} onClick={() => setSort(c.key)} style={{
                    padding: "0.75rem 0.5rem", textAlign: "center", cursor: "pointer",
                    color: sort === c.key ? "#F58426" : "#6b7280",
                    fontWeight: sort === c.key ? 700 : 500,
                    transition: "color 0.15s",
                  }}>
                    {c.label} {sort === c.key ? "▼" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p: any, i: number) => (
                <tr key={p.player_id} style={{
                  borderTop: "1px solid #1f2937",
                  background: i % 2 === 0 ? "transparent" : "#0d0d0d",
                }}>
                  <td style={{ padding: "0.65rem 1rem", color: "#f9fafb", fontWeight: 600 }}>{p.player_name}</td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "center", color: "#9ca3af" }}>{p.games_played}</td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "center", color: sort === "points_per_game" ? "#f9fafb" : "#d1d5db", fontWeight: sort === "points_per_game" ? 700 : 400 }}>{p.points_per_game?.toFixed(1)}</td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "center", color: sort === "rebounds_per_game" ? "#f9fafb" : "#d1d5db", fontWeight: sort === "rebounds_per_game" ? 700 : 400 }}>{p.rebounds_per_game?.toFixed(1)}</td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "center", color: sort === "assists_per_game" ? "#f9fafb" : "#d1d5db", fontWeight: sort === "assists_per_game" ? 700 : 400 }}>{p.assists_per_game?.toFixed(1)}</td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "center", color: sort === "field_goal_pct" ? "#f9fafb" : "#d1d5db", fontWeight: sort === "field_goal_pct" ? 700 : 400 }}>{((p.field_goal_pct ?? 0) * 100).toFixed(1)}%</td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "center", color: sort === "three_point_pct" ? "#f9fafb" : "#d1d5db", fontWeight: sort === "three_point_pct" ? 700 : 400 }}>{((p.three_point_pct ?? 0) * 100).toFixed(1)}%</td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "center", color: sort === "minutes_per_game" ? "#f9fafb" : "#d1d5db", fontWeight: sort === "minutes_per_game" ? 700 : 400 }}>{p.minutes_per_game?.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
