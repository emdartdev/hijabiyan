import { formatBDT } from "@/lib/money";
import { NavLink } from "@/components/NavLink";
import { convertDriveUrl } from "@/lib/image-utils";
import { upsertCartItem } from "@/lib/cart";
import { useToast } from "@/components/ui/use-toast";
import SiteButton from "@/components/site/SiteButton";

export type ProductCardModel = {
  id: string;
  slug: string;
  title_bn: string;
  price_bdt: number;
  discount_price_bdt: number | null;
  compare_at_price_bdt: number | null;
  image_url: string | null;
};

type Props = {
  p: ProductCardModel;
};

export default function ProductCard({ p }: Props) {
  const { toast } = useToast();
  
  const displayPrice = p.discount_price_bdt ?? p.price_bdt;
  const hasDiscount = p.discount_price_bdt !== null && p.discount_price_bdt < p.price_bdt;
  const hasComparePrice = !hasDiscount && p.compare_at_price_bdt !== null && p.compare_at_price_bdt > p.price_bdt;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    
    upsertCartItem({
      productId: p.id,
      variantId: null,
      titleBn: p.title_bn,
      imageUrl: p.image_url,
      colorBn: null,
      sizeBn: null,
      unitPriceBdt: displayPrice,
      qty: 1,
    });
    
    toast({ 
      title: "কার্টে যোগ হয়েছে", 
      description: `${p.title_bn} কার্টে যোগ করা হয়েছে।` 
    });
  };

  return (
    <NavLink
      to={`/product/${p.slug}`}
      className="group block overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg hover:border-primary/20"
    >
      <div className="aspect-[3/4] overflow-hidden bg-muted">
        {p.image_url ? (
          <img
            src={convertDriveUrl(p.image_url)}
            alt={p.title_bn}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">ছবি নেই</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-medium text-foreground/90 group-hover:text-primary transition-colors">
          {p.title_bn}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          {hasDiscount ? (
            <>
              <span className="text-sm text-muted-foreground line-through">{formatBDT(p.price_bdt)}</span>
              <span className="text-base font-semibold text-primary">{formatBDT(p.discount_price_bdt!)}</span>
            </>
          ) : hasComparePrice ? (
            <>
              <span className="text-sm text-muted-foreground line-through">{formatBDT(p.compare_at_price_bdt!)}</span>
              <span className="text-base font-semibold text-primary">{formatBDT(p.price_bdt)}</span>
            </>
          ) : (
            <span className="text-base font-semibold text-primary">{formatBDT(displayPrice)}</span>
          )}
        </div>
        
        <div className="space-y-2">
          <SiteButton 
            onClick={handleAddToCart}
            className="w-full"
            size="sm"
          >
            কার্টে যোগ করুন
          </SiteButton>
          
          <SiteButton 
            asChild
            variant="outline"
            className="w-full"
            size="sm"
          >
            <NavLink to={`/product/${p.slug}`}>বিস্তারিত দেখুন</NavLink>
          </SiteButton>
        </div>
      </div>
    </NavLink>
  );
}
