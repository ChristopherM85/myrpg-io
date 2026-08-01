import { publicEditorialAssetUrl } from "./editorial-media";

type Props = {
  title: string;
  category?: string;
  label?: string;
  eager?: boolean;
  image?: { assetUrl: string | null; status?: string | null; altText: string; caption: string | null; credit: string | null; width: number | null; height: number | null };
};

export function EditorialVisual({ title, category = "MMO intelligence", label = "Editorial brief", eager = true, image }: Props) {
  const src = publicEditorialAssetUrl(image);
  if (src) return <figure className="editorial-visual editorial-visual-approved"><div className="editorial-visual-frame"><img src={src} alt={image!.altText} width={image!.width ?? 1200} height={image!.height ?? 675} loading={eager ? "eager" : "lazy"} /><div aria-hidden="true" /></div><figcaption><span>{image!.caption || image!.altText}</span><span>{image!.credit || "Approved editorial media"}</span></figcaption></figure>;
  const theme = themeFor(category);
  return <figure className="editorial-visual editorial-visual-fallback" aria-label="MyRPG editorial graphic — not gameplay"><div className="editorial-visual-frame"><img src={theme.src} alt={theme.alt} width="1600" height="900" loading={eager ? "eager" : "lazy"} /><div aria-hidden="true" /></div><figcaption><span>MyRPG editorial graphic — not gameplay.</span><span>{theme.label}</span></figcaption><div className="editorial-visual-fallback-copy"><small>MYRPG EDITORIAL GRAPHIC — NOT GAMEPLAY</small><h2>{title}</h2><p>{category} · {label}</p></div></figure>;
}

const themes = {
  fantasy: { src: "/editorial/dark-fantasy-intelligence.png", label: "Dark fantasy intelligence", alt: "Original MyRPG dark fantasy editorial landscape with abstract map and distant architecture" },
  science: { src: "/editorial/science-fiction-intelligence.png", label: "Science-fiction intelligence", alt: "Original MyRPG science-fiction editorial horizon with abstract navigation marks" },
  anime: { src: "/editorial/anime-inspired-intelligence.png", label: "Anime-inspired intelligence", alt: "Original MyRPG stylized editorial skyline with abstract motion marks" },
  historical: { src: "/editorial/historical-intelligence.png", label: "Historical intelligence", alt: "Original MyRPG historical editorial survey landscape with abstract tactical routes" },
  strategy: { src: "/editorial/browser-strategy-intelligence.png", label: "Browser strategy intelligence", alt: "Original MyRPG browser strategy editorial city map with abstract data markers" },
  neutral: { src: "/editorial/neutral-official-updates.png", label: "Official update intelligence", alt: "Original MyRPG neutral editorial signal horizon with abstract data points" },
};

function themeFor(category: string) {
  const value = category.toLowerCase();
  if (value.includes("sci")) return themes.science;
  if (value.includes("anime")) return themes.anime;
  if (value.includes("histor")) return themes.historical;
  if (value.includes("strategy") || value.includes("browser")) return themes.strategy;
  if (value.includes("fantasy")) return themes.fantasy;
  return themes.neutral;
}
