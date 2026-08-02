type EditorialAsset = {
  assetUrl?: string | null;
  status?: string | null;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

export const EDITORIAL_GRAPHICS = {
  neutral: { label: "Neutral official updates", src: "/editorial/neutral-official-updates.png", alt: "Original MyRPG neutral editorial signal horizon with abstract data points", width: 1672, height: 941 },
  fantasy: { label: "Dark fantasy intelligence", src: "/editorial/dark-fantasy-intelligence.png", alt: "Original MyRPG dark fantasy editorial landscape with abstract map and distant architecture", width: 1672, height: 941 },
  science: { label: "Science-fiction intelligence", src: "/editorial/science-fiction-intelligence.png", alt: "Original MyRPG science-fiction editorial horizon with abstract navigation marks", width: 1672, height: 941 },
  "science-transit": { label: "Science-fiction transit intelligence", src: "/editorial/science-transit-intelligence.png", alt: "Original MyRPG deep-space transit lattice with abstract jump rings and energy routes", width: 1672, height: 941, position: "72% center" },
  "science-campaign": { label: "Science-fiction campaign intelligence", src: "/editorial/science-campaign-intelligence.png", alt: "Original MyRPG interstellar campaign map with a luminous nebula and abstract strategic routes", width: 1672, height: 941, position: "28% center" },
  anime: { label: "Anime-inspired intelligence", src: "/editorial/anime-inspired-intelligence.png", alt: "Original MyRPG stylized editorial skyline with abstract motion marks", width: 1672, height: 941 },
  historical: { label: "Historical intelligence", src: "/editorial/historical-intelligence.png", alt: "Original MyRPG historical editorial survey landscape with abstract tactical routes", width: 1672, height: 941 },
  strategy: { label: "Browser strategy intelligence", src: "/editorial/browser-strategy-intelligence.png", alt: "Original MyRPG browser strategy editorial city map with abstract data markers", width: 1672, height: 941 },
  "fantasy-live": { label: "Fantasy live-service intelligence", category: "fantasy_live_service", rights: "Original MyRPG editorial artwork; not gameplay.", src: "/editorial/fantasy-live-service-intelligence.png", alt: "Original MyRPG fantasy editorial citadel illuminated by cyan and violet atmospheric signals", width: 1672, height: 941, position: "68% center" },
  "science-profile": { label: "Science-fiction world profile", category: "science_fiction_profile", rights: "Original MyRPG editorial artwork; not gameplay.", src: "/editorial/science-profile-intelligence.png", alt: "Original MyRPG orbital world editorial scene with a turquoise planet and abstract navigation paths", width: 1672, height: 941, position: "32% center" },
  "anime-update": { label: "Anime-inspired live update", category: "anime_styled_update", rights: "Original MyRPG editorial artwork; not gameplay.", src: "/editorial/anime-update-intelligence.png", alt: "Original MyRPG colorful floating-city editorial landscape with crystalline architecture", width: 1672, height: 941, position: "38% center" },
  "historical-world": { label: "Historical world intelligence", category: "historical_world", rights: "Original MyRPG editorial artwork; not gameplay.", src: "/editorial/historical-world-intelligence.png", alt: "Original MyRPG fortified coastal-world editorial scene with abstract route markers", width: 1672, height: 941, position: "70% center" },
  "neutral-industry": { label: "MMO industry signal", category: "neutral_industry_announcement", rights: "Original MyRPG editorial artwork; not gameplay.", src: "/editorial/neutral-industry-intelligence.png", alt: "Original MyRPG global signal observatory with abstract constellation and network geometry", width: 1672, height: 941, position: "38% center" },
} as const;

export type EditorialGraphicKey = keyof typeof EDITORIAL_GRAPHICS;

export function editorialGraphic(value?: string | null) {
  return EDITORIAL_GRAPHICS[value as EditorialGraphicKey] ?? EDITORIAL_GRAPHICS.neutral;
}

export function isEditorialGraphic(value?: string | null): value is EditorialGraphicKey {
  return Boolean(value && value in EDITORIAL_GRAPHICS);
}

function stableIndex(value: string, size: number) {
  return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7) % size;
}

/** Suggests an original-art category from visible stored facts; it never mutates a record. */
export function recommendEditorialGraphic(record: { kind: "article" | "game"; title: string; setting?: string | null }) {
  const subject = `${record.title} ${record.setting || ""}`.toLowerCase();
  let pool: EditorialGraphicKey[];
  if (/eve|star wars|swtor|dune|science|sci-fi|space|corepunk/.test(subject)) pool = ["science", "science-profile", "science-transit", "science-campaign"];
  else if (/lost ark|final fantasy|anime|chrono|archeage/.test(subject)) pool = ["anime", "anime-update", "fantasy-live"];
  else if (/new world|historical|medieval|albion|runescape/.test(subject)) pool = ["historical", "historical-world", "strategy"];
  else if (/browser|adventurequest|strategy/.test(subject)) pool = ["strategy", "historical-world", "neutral-industry"];
  else if (/warcraft|elder scrolls|guild wars|black desert|fantasy|ashes|pax dei/.test(subject)) pool = ["fantasy", "fantasy-live", "anime-update"];
  else pool = ["neutral", "neutral-industry", record.kind === "article" ? "fantasy-live" : "science-profile"];
  return pool[stableIndex(`${record.kind}:${record.title}`, pool.length)];
}

/** Public images are served only from the approved MyRPG media route. */
export function publicEditorialAssetUrl(asset?: EditorialAsset | null) {
  if (!asset || asset.status !== "approved") return null;
  return asset.assetUrl?.startsWith("/media/") ? asset.assetUrl : null;
}

export function hasPublicEditorialVisual(asset?: EditorialAsset | null) {
  return Boolean(publicEditorialAssetUrl(asset) && asset.altText?.trim() && asset.width && asset.height);
}

/** A published record's selected original MyRPG artwork is safe for social metadata. */
export function publicEditorialImage(asset?: EditorialAsset | null, graphic?: string | null) {
  return publicEditorialAssetUrl(asset) ?? editorialGraphic(graphic).src;
}
