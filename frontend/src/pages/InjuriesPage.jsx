import { useQuery } from "@tanstack/react-query";
import { getInjuries } from "../utils/api";
const STATUS_COLORS = {
    "Out": { bg: "#450a0a", color: "#fca5a5" },
    "Doubtful": { bg: "#431407", color: "#fdba74" },
    "Questionable": { bg: "#422006", color: "#fcd34d" },
    "Day-To-Day": { bg: "#0c1a4b", color: "#93c5fd" },
};
export default function InjuriesPage() {
    const { data, isLoading } = useQuery({ queryKey: ["injuries"], queryFn: getInjuries });
    const H1 = { fontFamily: "Bebas Neue, sans-serif", fontSize: "3rem", letterSpacing: "0.15em", color: "#F58426" };
    return (<div style={{ maxWidth: "700px" }}>
      <header style={{ borderBottom: "1px solid #1f2937", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={H1}>INJURY REPORT</h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>New York Knicks — updated via ESPN</p>
      </header>

      {isLoading && (<ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {Array.from({ length: 5 }).map((_, i) => (<li key={i} style={{ background: "#111827", borderRadius: "0.75rem", height: "64px" }}/>))}
        </ul>)}

      {data && data.length === 0 && (<div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: "0.75rem", padding: "1.5rem", textAlign: "center" }}>
          <p style={{ color: "#4ade80", fontSize: "1rem", fontWeight: 600 }}>No injuries reported</p>
          <p style={{ color: "#16a34a", fontSize: "0.875rem", marginTop: "0.25rem" }}>Full roster appears healthy</p>
        </div>)}

      <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {(data ?? []).map((p) => {
            const style = STATUS_COLORS[p.status] ?? { bg: "#1f2937", color: "#d1d5db" };
            return (<li key={p.player_id} style={{
                    background: "#111827", border: "1px solid #1f2937", borderRadius: "0.75rem",
                    padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
              <div>
                <p style={{ color: "#f9fafb", fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>{p.player_name}</p>
                {p.reason && <p style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: "0.2rem" }}>{p.reason}</p>}
              </div>
              <span style={{
                    background: style.bg, color: style.color,
                    padding: "0.3rem 0.8rem", borderRadius: "999px",
                    fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                }}>{p.status}</span>
            </li>);
        })}
      </ul>
    </div>);
}
