import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SiteButton from "@/components/site/SiteButton";
import { convertDriveUrl } from "@/lib/image-utils";

type PopupRow = {
  id: string;
  title_bn: string | null;
  body_bn: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
};

export default function HomepageCouponPopup() {
  const [open, setOpen] = useState(false);
  const [popup, setPopup] = useState<PopupRow | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("homepage_coupon_popup")
        .select("id, title_bn, body_bn, image_url, link_url, is_active")
        .eq("id", "main")
        .maybeSingle();
      if (ignore) return;
      if (error) {
        console.error("Popup load error:", error);
        return;
      }
      const row = (data ?? null) as any as PopupRow | null;
      if (row?.is_active) {
        setPopup(row);
        setOpen(true);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  if (!popup) return null;

  const link = (popup.link_url ?? "").trim();
  const hasLink = !!link;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{popup.title_bn ?? "নতুন অফার"}</DialogTitle>
          {popup.body_bn ? <DialogDescription>{popup.body_bn}</DialogDescription> : null}
        </DialogHeader>

        {popup.image_url ? (
          <img
            src={convertDriveUrl(popup.image_url)}
            alt={popup.title_bn ?? "Coupon popup"}
            className="w-full rounded-md border"
            loading="lazy"
          />
        ) : null}

        {hasLink ? (
          <SiteButton asChild>
            <a href={link}>দেখুন</a>
          </SiteButton>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
