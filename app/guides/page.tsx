import { PublicPage } from "../components/PublicChrome";

export const metadata = { title: "MMO Guides | MyRPG.IO", description: "Practical MMO guides, published only after editorial review.", alternates: { canonical: "https://myrpg.io/guides" }, robots: { index: false, follow: true } };

export default function Guides() {
  return <PublicPage><nav aria-label="Breadcrumb"><a href="/">Home</a> / Guides</nav><p style={{ color: "#76f5e3", fontWeight: 800, fontSize: 11, letterSpacing: 1.5, marginTop: 30 }}>MYRPG / GUIDES</p><h1 style={{ fontSize: "clamp(2.6rem,7vw,5rem)", letterSpacing: "-.06em" }}>Game guides</h1><section className="editorial-info-panel"><p>GUIDE DESK / STANDING BY</p><h2>Guides arrive after editorial review</h2><p>Practical, source-backed guides will appear here only when complete and human-approved.</p></section></PublicPage>;
}
