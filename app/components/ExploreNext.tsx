type Link = { href: string; label: string; note: string };

export function ExploreNext({ links }: { links: Link[] }) {
  return <section className="explore-next" aria-label="Explore next"><p>EXPLORE NEXT</p><div>{links.map((link) => <a href={link.href} key={link.href}><strong>{link.label}</strong><span>{link.note} <b aria-hidden="true">→</b></span></a>)}</div></section>;
}
