import { editorialGraphic, publicEditorialAssetUrl } from "./editorial-media";

type Props = {
  title: string;
  category?: string;
  label?: string;
  eager?: boolean;
  themeKey?: string | null;
  image?: { assetUrl: string | null; status?: string | null; altText: string; caption: string | null; credit: string | null; width: number | null; height: number | null };
};

export function EditorialVisual({ title, category = "MMO intelligence", label = "Editorial brief", eager = true, image, themeKey }: Props) {
  const src = publicEditorialAssetUrl(image);
  if (src) return <figure className="editorial-visual editorial-visual-approved"><div className="editorial-visual-frame"><img src={src} alt={image!.altText} width={image!.width ?? 1200} height={image!.height ?? 675} loading={eager ? "eager" : "lazy"} /><div aria-hidden="true" /></div><figcaption><span>{image!.caption || image!.altText}</span><span>{image!.credit || "Approved editorial media"}</span></figcaption></figure>;
  const theme = editorialGraphic(themeKey);
  return <figure className="editorial-visual editorial-visual-fallback" aria-label="MyRPG editorial graphic — not gameplay"><div className="editorial-visual-frame"><img src={theme.src} alt={theme.alt} width={theme.width} height={theme.height} loading={eager ? "eager" : "lazy"} /><div aria-hidden="true" /></div><figcaption><span>MyRPG editorial graphic — not gameplay.</span><span>{theme.label}</span></figcaption><div className="editorial-visual-fallback-copy"><small>MYRPG EDITORIAL GRAPHIC — NOT GAMEPLAY</small><h2>{title}</h2><p>{category} · {label}</p></div></figure>;
}
