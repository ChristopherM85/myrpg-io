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
  return <figure className="editorial-visual editorial-visual-fallback" aria-label="MyRPG editorial graphic — not gameplay"><small>MYRPG EDITORIAL GRAPHIC — NOT GAMEPLAY</small><h2>{title}</h2><p>{category} · {label}</p></figure>;
}
