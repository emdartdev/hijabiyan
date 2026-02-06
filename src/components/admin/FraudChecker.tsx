import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

interface FraudData {
  success: boolean;
  total_order: number;
  success_order: number;
  cancel_order: number;
  order_ratio: string;
  fraud_status: string;
  message?: string;
}

export default function FraudChecker({ phone }: { phone: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FraudData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data: result } = await supabase.functions.invoke("fraud-check", {
          body: { action: "check-connection" },
        });
        setIsConnected(result?.success || result?.status === "success");
      } catch (err) {
        console.error("Connection Check Error:", err);
        setIsConnected(false);
      }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    if (!phone) return;

    const checkFraud = async () => {
      const cleanPhone = phone.replace(/\D/g, "");
      if (!cleanPhone) {
        setError("Invalid phone number");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data: result, error: funcError } = await supabase.functions.invoke("fraud-check", {
          body: { phone: cleanPhone },
        });

        if (funcError) {
          throw funcError;
        }

        setData(result);
      } catch (err: any) {
        console.error("Fraud Check Error:", err);
        setError(err.message || "An error occurred while checking fraud status");
      } finally {
        setLoading(false);
      }
    };

    checkFraud();
  }, [phone]);

  if (loading) {
    return (
      <Card className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm">ফ্রড চেক করা হচ্ছে...</span>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive/20 bg-destructive/5">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">চেক করা সম্ভব হয়নি: {error}</span>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const ratio = parseFloat(data.order_ratio);
  const isHighRisk = ratio < 70 && data.total_order > 2;

  return (
    <Card className={`p-4 border-2 ${isHighRisk ? 'border-destructive/30 bg-destructive/5' : 'border-primary/10'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isHighRisk ? (
            <ShieldAlert className="h-5 w-5 text-destructive" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          <span className="font-semibold text-sm">BD Courier ফ্রড ট্র্যাকার ({phone})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${isConnected === true ? 'bg-green-500 animate-pulse' : isConnected === false ? 'bg-destructive' : 'bg-muted'}`} title={isConnected ? 'API Connected' : 'API Connection Issue'} />
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {isConnected === true ? 'Connected' : isConnected === false ? 'Offline' : 'Checking...'}
            </span>
          </div>
          <Badge variant={isHighRisk ? "destructive" : "outline"} className="text-[10px] uppercase">
            {data.fraud_status || (isHighRisk ? "High Risk" : "Safe")}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
          <p className="font-bold text-sm">{data.total_order}</p>
        </div>
        <div className="rounded bg-green-500/10 p-2">
          <p className="text-[10px] text-green-600 uppercase">Success</p>
          <p className="font-bold text-sm text-green-700">{data.success_order}</p>
        </div>
        <div className="rounded bg-destructive/10 p-2">
          <p className="text-[10px] text-destructive uppercase">Cancel</p>
          <p className="font-bold text-sm text-destructive">{data.cancel_order}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-full bg-muted p-1 px-3">
        <span className="text-xs font-medium">ডেলিভারি রেশিও</span>
        <span className={`text-sm font-bold ${ratio >= 80 ? 'text-green-600' : ratio >= 60 ? 'text-yellow-600' : 'text-destructive'}`}>
          {data.order_ratio}%
        </span>
      </div>

      {isHighRisk && (
        <p className="mt-2 text-[11px] text-destructive font-medium leading-tight">
          সতর্কতা: এই কাস্টমারের ডেলিভারি রেশিও কম। অর্ডার কনফার্ম করার আগে ভালোভাবে যাচাই করে নিন।
        </p>
      )}
    </Card>
  );
}
