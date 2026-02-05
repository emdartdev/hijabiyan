import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";

import SiteButton from "@/components/site/SiteButton";

const WHATSAPP_NUMBER_DISPLAY = "+880 1759-498905";
const WHATSAPP_NUMBER_WA = "8801759498905";

export default function WhatsAppFab() {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <SiteButton asChild size="lg" aria-label={`WhatsApp: ${WHATSAPP_NUMBER_DISPLAY}`}>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER_WA}`}
          target="_blank"
          rel="noreferrer"
          className="gap-2"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">WhatsApp</span>
          <span className="ml-1 hidden sm:inline text-xs opacity-90">{WHATSAPP_NUMBER_DISPLAY}</span>
        </a>
      </SiteButton>
    </div>
  );
}
