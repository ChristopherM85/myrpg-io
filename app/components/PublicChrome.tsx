const links = [["News", "/news"], ["Games", "/games"], ["MMO Radar", "/mmo-radar"], ["Calendar", "/calendar"], ["Compare", "/compare"], ["Find My MMO", "/find-my-mmo"]] as const;

export function PublicHeader() {
  return <><a className="skip-link" href="#main-content">Skip to main content</a><header className="public-header"><div className="public-header-inner"><a className="public-brand" href="/" aria-label="MyRPG.IO home">MY<span>RPG</span><i>.IO</i></a><nav aria-label="Primary navigation" className="public-nav">{links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav><a className="public-console-link" href="/admin">Director Console <span aria-hidden="true">→</span></a></div></header></>;
}

export function PublicFooter() {
  return <footer className="public-footer"><div className="public-footer-inner"><p>MyRPG.IO is MMO intelligence with human accountability. Editorial content is source-linked and human-reviewed.</p><nav aria-label="Site information">{[["Official Updates", "/official-updates"], ["MMO Radar", "/mmo-radar"], ["Writers", "/writers"], ["Editorial Standards", "/editorial-standards"], ["Corrections", "/corrections"], ["AI Transparency", "/ai-transparency"], ["Advertising Disclosure", "/advertising-disclosure"], ["Privacy", "/privacy"]].map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav></div></footer>;
}

export function NetworkFeature() {
  return <aside aria-label="Featured game from the MyRPG network" style={{ border: "1px solid #735d2e", borderLeft: "3px solid #c9a666", padding: "22px 24px", background: "linear-gradient(110deg,#12100d,#1b1610)", color: "#e6dfd2" }}><small style={{ color: "#c9a666", fontWeight: 800, letterSpacing: 1.2 }}>FEATURED GAME FROM THE MYRPG NETWORK</small><h2 style={{ margin: "8px 0", fontSize: 22 }}>MyMafia.io — Build an empire. Keep an alibi.</h2><p style={{ color: "#bdb4a7", margin: "0 0 14px" }}>A browser strategy MMORPG where crimes become careers, allies become families, and every city keeps a different secret.</p><a href="/network/mymafia" style={{ color: "#c9a666", fontWeight: 800 }}>Read the network feature →</a></aside>;
}

export function PublicPage({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <><PublicHeader /><main id="main-content" className={`public-page ${className}`.trim()}>{children}</main><PublicFooter /></>; }
