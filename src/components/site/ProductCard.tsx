import { Card, CardContent } from "@/components/ui/card";
import SiteButton from "@/components/site/SiteButton";
import { formatBDT } from "@/lib/money";
import { NavLink } from "@/components/NavLink";
import { convertDriveUrl } from "@/lib/image-utils";

export type ProductCardModel = {
  id: string;
  slug: string;
  title_bn: string;
  price_bdt: number;
  compare_at_price_bdt: number | null;
  image_url?: string | null;
};

export default function ProductCard({ p }: { p: ProductCardModel }) {
  const discount = p.compare_at_price_bdt && p.compare_at_price_bdt > p.price_bdt;
  const imageUrl = convertDriveUrl(p.image_url);

  return (
    <Card className="overflow-hidden">
      <NavLink to={`/p/${p.slug}`} className="block">
        <div className="aspect-[4/5] w-full bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt={p.title_bn} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">ছবি নেই</div>
          )}
        </div>
      </NavLink>
      <CardContent className="space-y-2 p-4">
        <div className="line-clamp-2 text-sm font-medium leading-snug">{p.title_bn}</div>
        <div className="flex items-center gap-2">
          <div className="font-semibold">{formatBDT(p.price_bdt)}</div>
          {discount ? (
            <div className="text-xs text-muted-foreground line-through">{formatBDT(p.compare_at_price_bdt as number)}</div>
          ) : null}
        </div>
        <SiteButton asChild size="sm" className="w-full">
          <NavLink to={`/p/${p.slug}`}>বিস্তারিত দেখুন</NavLink>
        </SiteButton>
      </CardContent>
    </Card>
  );
}
