import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  Info, 
  CheckSquare, 
  PauseCircle, 
  XOctagon,
  Phone,
  Truck,
  History,
  ShieldCheck
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface FraudBreakdownProps {
  phone: string;
  orderId: string;
  onUpdateStatus?: () => void;
}

export default function FraudBreakdown({ phone, orderId, onUpdateStatus }: FraudBreakdownProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!phone) return;
    fetchFraudDetails();
  }, [phone, orderId]);

  const fetchFraudDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: funcError } = await supabase.functions.invoke("fraud-check", {
        body: { phone, orderId },
      });
      if (funcError) throw funcError;
      setData(result);
    } catch (err: any) {
      console.error("Fraud Breakdown Error:", err);
      setError(err.message || "Failed to load fraud breakdown");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'hold' | 'fraud') => {
    setBusy(true);
    try {
      let statusUpdate = {};
      if (action === 'fraud') {
        statusUpdate = { is_fraud: true, status: 'cancelled' };
      } else if (action === 'approve') {
        statusUpdate = { is_fraud: false, status: 'confirmed' };
      } else if (action === 'hold') {
        statusUpdate = { status: 'confirmed', notes_bn: 'অর্ডারটি ভেরিফিকেশনের জন্য হোল্ডে রাখা হয়েছে।' };
      }

      const { error } = await (supabase
        .from("orders")
        .update({
          ...statusUpdate,
          fraud_score: data?.scoring?.score ?? 0,
          fraud_status: data?.scoring?.status ?? 'low',
          fraud_reasons: data?.scoring?.reasons ?? [],
          fraud_check_at: new Date().toISOString()
        } as any)
        .eq("id", orderId));

      if (error) throw error;
      
      toast({ title: "অ্যাকশন সম্পন্ন হয়েছে" });
      if (onUpdateStatus) onUpdateStatus();
    } catch (err: any) {
      toast({ title: "অ্যাকশন ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return (
    <Card className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin mr-3 text-primary" />
      <span className="text-sm font-medium">ফ্রড অ্যানালাইসিস চলছে...</span>
    </Card>
  );

  if (error) return (
    <Card className="p-4 border-destructive/20 bg-destructive/5 text-destructive text-sm">
      ফ্রড চেক করা সম্ভব হয়নি: {error}
    </Card>
  );

  if (!data) return null;

  const { scoring, bd_courier, internal } = data;
  const score = scoring.score;
  const status = scoring.status;

  return (
    <div className="space-y-4">
      <Card className={`overflow-hidden border-2 ${
        status === 'high' ? 'border-destructive/40' : 
        status === 'medium' ? 'border-yellow-500/40' : 
        'border-green-500/40'
      }`}>
        <div className={`p-4 flex items-center justify-between ${
          status === 'high' ? 'bg-destructive/10' : 
          status === 'medium' ? 'bg-yellow-500/10' : 
          'bg-green-500/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              status === 'high' ? 'bg-destructive/20' : 
              status === 'medium' ? 'bg-yellow-500/20' : 
              'bg-green-500/20'
            }`}>
              {status === 'high' ? <ShieldAlert className="h-5 w-5 text-destructive" /> : 
               status === 'medium' ? <AlertTriangle className="h-5 w-5 text-yellow-600" /> : 
               <ShieldCheck className="h-5 w-5 text-green-600" />}
            </div>
            <div>
              <h3 className="font-bold text-sm">ফ্রড রিস্ক লেভেল: {status.toUpperCase()}</h3>
              <p className="text-xs opacity-80">স্কোর: {score}/১০০</p>
            </div>
          </div>
          <Badge variant={status === 'high' ? 'destructive' : status === 'medium' ? 'secondary' : 'default'}>
            {score}% Risk
          </Badge>
        </div>

        <div className="p-4 space-y-4">
          {scoring.reasons.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Info size={12} /> কারণসমূহ
              </p>
              <ul className="grid gap-1.5">
                {scoring.reasons.map((r: string, i: number) => (
                  <li key={i} className="text-xs flex items-start gap-2 text-foreground/90">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Courier Signals */}
            <div className="rounded-lg bg-muted/30 p-3 space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Truck size={10} /> Courier Signals
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span>BD Courier Ratio</span>
                  <span className="font-bold">{bd_courier?.order_ratio ?? 'N/A'}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Steadfast Report</span>
                  <span className="font-bold">{data.steadfast?.status ?? 'Clean'}</span>
                </div>
              </div>
            </div>

            {/* Internal History */}
            <div className="rounded-lg bg-muted/30 p-3 space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <History size={10} /> Store History
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span>সফল ডেলিভারি</span>
                  <span className="font-bold text-green-600">{internal?.success_count ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>বাতিল অর্ডার</span>
                  <span className="font-bold text-destructive">{internal?.cancel_count ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t mt-4">
            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 h-8 text-[11px]" onClick={() => handleAction('approve')} disabled={busy}>
              <CheckSquare size={14} className="mr-1" /> Approve & Confirm
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => handleAction('hold')} disabled={busy}>
              <PauseCircle size={14} className="mr-1" /> Hold Verification
            </Button>
            <Button size="sm" variant="destructive" className="h-8 text-[11px]" onClick={() => handleAction('fraud')} disabled={busy}>
              <XOctagon size={14} className="mr-1" /> Mark as Fraud
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
