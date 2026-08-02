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
} as const;

export type EditorialGraphicKey = keyof typeof EDITORIAL_GRAPHICS;

export function editorialGraphic(value?: string | null) {
  return EDITORIAL_GRAPHICS[value as EditorialGraphicKey] ?? EDITORIAL_GRAPHICS.neutral;
}

export function isEditorialGraphic(value?: string | null): value is EditorialGraphicKey {
  return Boolean(value && value in EDITORIAL_GRAPHICS);
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
