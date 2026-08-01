import { PublicPage } from "./components/PublicChrome";

export const metadata = { title: "Page not found | MyRPG.IO", robots: { index: false, follow: true } };

export default function NotFound() {
  return <PublicPage><nav aria-label="Breadcrumb"><a href="/">Home</a> / Page not found</nav><p style={eyebrow}>MYRPG / 404</p><h1 style={heading}>That MMO trail went cold.</h1><p style={lede}>This page does not exist, may have moved, or is not publicly available. Explore a verified MyRPG route instead.</p><section style={grid} aria-label="Continue exploring">{[["Home", "/", "Return to the editorial dashboard."], ["MMO news", "/news", "Read published source-linked coverage."], ["Games", "/games", "Browse factual game profiles."], ["MMO Radar", "/mmo-radar", "See structured directory coverage."], ["Official updates", "/official-updates", "Browse reviewed announcement coverage."], ["Release calendar", "/calendar", "See owner-published date records."], ["Compare games", "/compare", "Compare visible factual fields."], ["Find My MMO", "/find-my-mmo", "Match your preferences to verified fields."]].map(([label, href, note]) => <a key={href} href={href} style={card}><strong>{label}</strong><span>{note} <b>→</b></span></a>)}</section></PublicPage>;
}

const eyebrow = { color: "#76f5e3", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginTop: 30 };
const heading = { fontSize: "clamp(2.8rem,7vw,5.4rem)", letterSpacing: "-.06em", margin: "12px 0" };
const lede = { color: "#aeb6c7", lineHeight: 1.65, maxWidth: 620, fontSize: 17 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: 12, marginTop: 38 };
const card = { display: "block", border: "1px solid #2a3041", background: "#121622", padding: 20, color: "#edf3f5", textDecoration: "none" };
