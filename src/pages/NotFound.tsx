import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import SiteButton from "@/components/site/SiteButton";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-sm text-muted-foreground">ত্রুটি</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">404</h1>
        <p className="mt-3 text-base text-muted-foreground">আপনি যে পেজটি খুঁজছেন তা পাওয়া যায়নি।</p>
        <div className="mt-6">
          <SiteButton asChild>
            <a href="/">হোমে ফিরে যান</a>
          </SiteButton>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
