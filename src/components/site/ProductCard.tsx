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
  discount_price_bdt: number | null;
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
        <div className="mt-3">
        <h3 className="text-sm font-medium tracking-tight text-foreground/90 line-clamp-1 group-hover:text-primary transition-colors">{p.title_bn}</h3>
        <div className="mt-2 flex items-center gap-2">
          {p.discount_price_bdt ? (
            <>
              <span className="text-sm text-muted-foreground line-through opacity-70">
                {formatBDT(p.price_bdt)}
              </span>
              <span className="text-base font-bold text-primary">{formatBDT(p.discount_price_bdt)}</span>
            </>
          ) : p.compare_at_price_bdt && p.compare_at_price_bdt > p.price_bdt ? (
            <>
              <span className="text-sm text-muted-foreground line-through opacity-70">
                {formatBDT(p.compare_at_price_bdt)}
              </span>
              <span className="text-base font-bold text-primary">{formatBDT(p.price_bdt)}</span>
            </>
          ) : (
            <span className="text-base font-bold text-primary">{formatBDT(p.price_bdt)}</span>
          )}
        </div>
      </div>
  <SiteButton asChild size="sm" className="w-full">
          <NavLink to={`/p/${p.slug}`}>বিস্তারিত দেখুন</NavLink>
        </SiteButton>
      </CardContent>
    </Card>
  );
}
