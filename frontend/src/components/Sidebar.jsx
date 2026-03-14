import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, Target, TrendingUp, Newspaper, Activity, Calendar, BarChart2, LineChart, Menu, X } from "lucide-react";
const NAV = [
    { to: "/", label: "Dashboard", icon: Home },
    { to: "/predictions", label: "Predictions", icon: Target },
    { to: "/betting", label: "Betting", icon: TrendingUp },
    { to: "/news", label: "News Feed", icon: Newspaper },
    { to: "/injuries", label: "Injuries", icon: Activity },
    { to: "/schedule", label: "Schedule", icon: Calendar },
    { to: "/stats", label: "Stats", icon: BarChart2 },
    { to: "/tweets", label: "Betting Trends", icon: LineChart },
];
export default function Sidebar() {
    const [open, setOpen] = useState(false);
    const sidebarContent = (<>
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #1f2937", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontFamily: "Bebas Neue,sans-serif", fontSize: "2.25rem", letterSpacing: "0.15em", color: "#F58426" }}>KNICKS</span>
          <span style={{ fontFamily: "Bebas Neue,sans-serif", fontSize: "2.25rem", letterSpacing: "0.15em", color: "#006BB6" }}>HUB</span>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", display: "none" }} className="mobile-close-btn">
          <X size={22}/>
        </button>
      </div>

      <nav style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {NAV.map(({ to, label, icon: Icon }) => (<NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)} style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.6rem 1rem", borderRadius: "0.5rem",
                fontSize: "0.875rem", fontWeight: 500, textDecoration: "none",
                background: isActive ? "#1d4ed8" : "transparent",
                color: isActive ? "#fff" : "#9ca3af",
                transition: "all 0.15s",
            })}>
            <Icon size={18}/>
            {label}
          </NavLink>))}
      </nav>

      <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #1f2937", fontSize: "0.75rem", color: "#4b5563" }}>
        KnicksHub 2026
      </div>
    </>);
    return (<>
      <style>{`
        @media (max-width: 767px) {
          .mobile-close-btn { display: block !important; }
          .mobile-hamburger { display: block !important; }
          .mobile-backdrop  { display: block !important; }
          .knicks-sidebar   { transform: translateX(${open ? "0" : "-100%"}); }
        }
      `}</style>

      <button onClick={() => setOpen(true)} className="mobile-hamburger" style={{ position: "fixed", top: "1rem", left: "1rem", zIndex: 60, background: "#0d0d0d", border: "1px solid #1f2937", borderRadius: "0.5rem", padding: "0.5rem", color: "#F58426", cursor: "pointer", display: "none" }}>
        <Menu size={22}/>
      </button>

      {open && (<div onClick={() => setOpen(false)} className="mobile-backdrop" style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.6)", display: "none" }}/>)}

      <aside className="knicks-sidebar" style={{ position: "fixed", inset: "0 auto 0 0", width: "16rem", background: "#0d0d0d", borderRight: "1px solid #1f2937", display: "flex", flexDirection: "column", zIndex: 50, transition: "transform 0.25s ease" }}>
        {sidebarContent}
      </aside>
    </>);
}
