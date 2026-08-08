import { PublicPage } from "../components/PublicChrome";

export const metadata = { title: "Editorial Standards | MyRPG.IO", description: "How MyRPG sources, reviews, corrects, and publishes factual gaming coverage.", alternates: { canonical: "https://myrpg.io/editorial-standards" } };

const principles = [
  ["Official sources first", "We use approved developer, publisher, store, and press sources for factual claims."],
  ["Human approval before public release", "AI-assisted work may prepare private material, but an Owner makes every publication decision."],
  ["Visible evidence", "Published profiles and articles show citations and fact-check dates so readers can assess the record."],
  ["Corrections stay public", "When a material published statement needs changing, we document it in the public corrections log."],
];

export default function EditorialStandards() {
  return <PublicPage className="standards-page">
    <nav aria-label="Breadcrumb" className="standards-breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Editorial standards</span></nav>
    <header className="standards-hero"><p>MYRPG / EDITORIAL POLICY</p><h1>Built for useful signal, not more noise.</h1><p>MyRPG covers games with direct sources, clear editorial accountability, and practical context. We favor what can be checked over what merely sounds convincing.</p></header>
    <section className="standards-principles" aria-label="MyRPG editorial principles">{principles.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{copy}</p></article>)}</section>
    <section className="standards-detail">
      <div><p>THE WORKFLOW</p><h2>Private preparation. Owner decision. Public accountability.</h2></div>
      <div className="standards-detail-copy"><p>We store official citations, source dates where available, and fact-check dates for the records we publish. Private intake, evidence packets, and drafts do not appear in public feeds, search, or sitemaps.</p><p>We do not publish autonomous drafts, invented claims, ratings, player counts, or source-free recaps. Editorial artwork is clearly separated from official publisher material.</p><a href="/corrections">Read the public corrections log <span aria-hidden="true">→</span></a></div>
    </section>
    <section className="standards-boundary"><strong>What MyRPG is not</strong><p>We are not a live monitoring service, a user-review platform, or a rankings site. A game appearing here is factual coverage—not an endorsement.</p></section>
  </PublicPage>;
}
