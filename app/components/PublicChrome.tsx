import Link from "next/link";

const links = [["News", "/news"], ["Games", "/games"], ["MMO Radar", "/mmo-radar"], ["Calendar", "/calendar"], ["Compare", "/compare"], ["Find My MMO", "/find-my-mmo"]] as const;

export function PublicHeader() {
  return <><a className="skip-link" href="#main-content">Skip to main content</a><header className="public-header"><div className="public-header-inner"><Link className="public-brand" href="/" aria-label="MyRPG.IO home">MY<span>RPG</span><i>.IO</i></Link><nav aria-label="Primary navigation" className="public-nav">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><Link className="public-console-link" href="/admin">Director Console <span aria-hidden="true">→</span></Link></div></header></>;
}

export function PublicFooter() {
  return <footer className="public-footer"><div className="public-footer-inner"><p>MyRPG.IO is MMO intelligence with human accountability. Editorial content is source-linked and human-reviewed.</p><nav aria-label="Site information">{[["Official Updates", "/official-updates"], ["MMO Radar", "/mmo-radar"], ["Writers", "/writers"], ["Submit a game", "/submit-game"], ["Editorial Standards", "/editorial-standards"], ["Corrections", "/corrections"], ["AI Transparency", "/ai-transparency"], ["Advertising Disclosure", "/advertising-disclosure"], ["Privacy", "/privacy"]].map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav></div></footer>;
}

export function NetworkFeature() {
  return <aside className="home-network-feature" aria-label="Featured owner-operated game from the MyRPG network"><div className="home-network-feature-art" role="img" aria-label="Official MyMafia city artwork showing a rain-soaked noir waterfront and skyline" /><div className="home-network-feature-copy"><p>OWNER-OPERATED NETWORK FEATURE</p><h2>MyMafia.io</h2><span>Build an empire.<br />Keep an alibi.</span><div>Persistent browser strategy in a noir city of careers, families, businesses, heists, and territorial ambition.</div><nav aria-label="MyMafia links"><Link href="/network/mymafia">Read the feature →</Link><a href="https://mymafia.io/" target="_blank" rel="noopener sponsored">Enter MyMafia ↗</a></nav><small>Promotional placement. Not an independent review or rating.</small></div></aside>;
}

export function PublicPage({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <><PublicHeader /><main id="main-content" className={`public-page ${className}`.trim()}>{children}</main><PublicFooter /></>; }
