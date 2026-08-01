type EditorialAsset = {
  assetUrl?: string | null;
  status?: string | null;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

/** Public images are served only from the approved MyRPG media route. */
export function publicEditorialAssetUrl(asset?: EditorialAsset | null) {
  if (!asset || asset.status !== "approved") return null;
  return asset.assetUrl?.startsWith("/media/") ? asset.assetUrl : null;
}

export function hasPublicEditorialVisual(asset?: EditorialAsset | null) {
  return Boolean(publicEditorialAssetUrl(asset) && asset.altText?.trim() && asset.width && asset.height);
}
