import type { Metadata } from "next";
import { PublicFooter, PublicHeader } from "../../components/PublicChrome";

export const metadata: Metadata = {
  title: "MyMafia.io: A Persistent Noir Strategy MMORPG | MyRPG Network Feature",
  description: "Explore MyMafia.io, an owner-operated browser strategy MMORPG in public beta with persistent progression, families, heists, businesses, four cities, and no pay-to-power.",
  alternates: { canonical: "https://myrpg.io/network/mymafia" },
  openGraph: {
    type: "website",
    url: "https://myrpg.io/network/mymafia",
    title: "MyMafia.io: A Persistent Noir Strategy MMORPG",
    description: "A clearly labelled MyRPG Network Feature about the owner-operated browser strategy MMORPG MyMafia.io.",
    images: [{ url: "/editorial/browser-strategy-intelligence.png", width: 1600, height: 900, alt: "Original MyRPG noir strategy editorial artwork with a stylized city map and tactical markers; not gameplay" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyMafia.io: A Persistent Noir Strategy MMORPG",
    description: "A clearly labelled MyRPG Network Feature about the owner-operated browser strategy MMORPG MyMafia.io.",
    images: ["/editorial/browser-strategy-intelligence.png"],
  },
};

const officialUrl = "https://www.mymafia.io";
const playUrl = "/api/promo/click?placement=mymafia-network-feature";

export default function MyMafiaNetworkFeature() {
  return <>
    <PublicHeader />
    <main id="main-content" className="network-feature-page">
      <nav aria-label="Breadcrumb" className="network-feature-breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/advertising-disclosure">Network disclosure</a><span aria-hidden="true">/</span><span>MyMafia.io</span></nav>

      <header className="network-feature-hero">
        <div className="network-feature-hero-art" role="img" aria-label="Original MyRPG noir strategy editorial artwork with a stylized city map and tactical markers; not gameplay" />
        <div className="network-feature-hero-copy">
          <p className="network-feature-kicker">MYRPG NETWORK FEATURE · OWNER-OPERATED</p>
          <h1>Earn your reputation.<br /><em>Keep an alibi.</em></h1>
          <p className="network-feature-deck">MyMafia.io is a persistent, browser-based noir strategy MMORPG where quick jobs grow into careers, alliances become families, and every city creates a different set of opportunities.</p>
          <div className="network-feature-actions">
            <a className="network-feature-primary" href={playUrl} rel="sponsored">Register for the public beta <span aria-hidden="true">→</span></a>
            <a className="network-feature-secondary" href={`${officialUrl}/how-to-play`} target="_blank" rel="noopener sponsored">Read the official game guide</a>
          </div>
          <p className="network-feature-caption">MyRPG editorial graphic — not gameplay.</p>
        </div>
      </header>

      <aside className="network-feature-disclosure" aria-label="Ownership and editorial disclosure">
        <strong>Ownership disclosure</strong>
        <p>MyMafia.io is operated by the owner of MyRPG.IO. This is a clearly labelled MyRPG Network Feature, not an independent editorial review, rating, or recommendation. Game facts below are sourced from the official MyMafia website and were checked on August 3, 2026.</p>
      </aside>

      <article className="network-feature-body">
        <section>
          <p className="network-feature-section-label">THE LONG GAME</p>
          <h2>A city that remembers what you did</h2>
          <p>MyMafia is built around one persistent character whose reputation follows decisions across the game. Street work, careers, training, equipment, businesses, trading, vehicles, crafting, and branching chapters all feed the same continuing criminal career. The official game description emphasizes durable choices rather than a disposable round or session: earlier history remains part of the character record even as prestige opens alternate legacies.</p>
          <p>That persistence also extends to recovery and consequence systems. Hospital stays, jail, treatment, bail, legal aid, family rescues, messages, rivals, companions, and rotating events share the same world rather than appearing as disconnected minigames.</p>
        </section>

        <section className="network-feature-grid" aria-label="MyMafia feature highlights">
          <article><span>01</span><h3>Families, heists, and territory</h3><p>Create or join a family, develop facilities, share resources, plan heists, and compete in structured territory wars.</p></article>
          <article><span>02</span><h3>Business beyond crime buttons</h3><p>Manage businesses, trade with other players, tune vehicles, craft equipment, and develop a criminal career over time.</p></article>
          <article><span>03</span><h3>Choices that stay on file</h3><p>Branching chapters and rotating encounters preserve consequential decisions and private story history.</p></article>
          <article><span>04</span><h3>One game, four cities</h3><p>Port Cerise, Neon Harbor, Saint Marzipan, and Dustwater differ through fares, weather, shops, contacts, risks, and opportunities.</p></article>
        </section>

        <section>
          <p className="network-feature-section-label">FAIR-PLAY POSITION</p>
          <h2>Presentation can change. Power cannot be bought.</h2>
          <p>The official fair-play policy says progression comes from play, decisions, cooperation, and time. Credits are reserved for presentation and customization: they do not buy combat strength, better odds, faster cooldowns, protection, or progression. That distinction matters in a persistent strategy game, where a paid competitive shortcut would undermine the value of reputation and long-term planning.</p>
        </section>

        <section className="network-feature-beta">
          <div>
            <p className="network-feature-section-label">PUBLIC BETA</p>
            <h2>Free to test, with a clearly stated reset</h2>
            <p>Public beta registration is open. The game runs in a browser with no download and is designed to work from phone to desktop. Beta levels, cash, items, properties, pets, and progression will reset for Open Play. Verified beta players keep their Beta Tester badge and receive 25 launch credits.</p>
          </div>
          <div className="network-feature-casefile">
            <small>CASE FILE · BETA</small>
            <strong>No download</strong>
            <strong>Phone to desktop</strong>
            <strong>Free beta play</strong>
            <a href={playUrl} rel="sponsored">Enter the city →</a>
          </div>
        </section>

        <footer className="network-feature-source">
          <p><strong>Official source:</strong> <a href={officialUrl} target="_blank" rel="noopener sponsored">MyMafia.io</a></p>
          <p><strong>Fact-checked:</strong> August 3, 2026</p>
          <p><strong>Editorial status:</strong> Owner-operated network feature; promotional placement; no score or independent-review claim.</p>
        </footer>
      </article>
    </main>
    <PublicFooter />
  </>;
}
