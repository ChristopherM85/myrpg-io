type EditorialAsset = {
  assetUrl?: string | null;
  status?: string | null;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

export const EDITORIAL_GRAPHICS = {
  neutral: { label: "Neutral official updates", src: "/editorial/neutral-official-updates.png", alt: "Original MyRPG neutral editorial signal horizon with abstract data points" },
  fantasy: { label: "Dark fantasy intelligence", src: "/editorial/dark-fantasy-intelligence.png", alt: "Original MyRPG dark fantasy editorial landscape with abstract map and distant architecture" },
  science: { label: "Science-fiction intelligence", src: "/editorial/science-fiction-intelligence.png", alt: "Original MyRPG science-fiction editorial horizon with abstract navigation marks" },
  anime: { label: "Anime-inspired intelligence", src: "/editorial/anime-inspired-intelligence.png", alt: "Original MyRPG stylized editorial skyline with abstract motion marks" },
  historical: { label: "Historical intelligence", src: "/editorial/historical-intelligence.png", alt: "Original MyRPG historical editorial survey landscape with abstract tactical routes" },
  strategy: { label: "Browser strategy intelligence", src: "/editorial/browser-strategy-intelligence.png", alt: "Original MyRPG browser strategy editorial city map with abstract data markers" },
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
