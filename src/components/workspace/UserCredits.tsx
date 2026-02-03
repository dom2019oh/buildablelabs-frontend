import { useState, useEffect } from "react";
import { Coins, Gift, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CreditData {
  totalCredits: number;
  monthlyCredits: number;
  bonusCredits: number;
  rolloverCredits: number;
  topupCredits: number;
  lastDailyBonusAt: string | null;
  canClaimDaily: boolean;
}

export function UserCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const fetchCredits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      const lastBonus = data.last_daily_bonus_at
        ? new Date(data.last_daily_bonus_at)
        : null;
      const today = new Date();
      const canClaimDaily =
        !lastBonus ||
        lastBonus.toDateString() !== today.toDateString();

      setCredits({
        totalCredits:
          (data.monthly_credits || 0) +
          (data.bonus_credits || 0) +
          (data.rollover_credits || 0) +
          (data.topup_credits || 0),
        monthlyCredits: data.monthly_credits || 0,
        bonusCredits: data.bonus_credits || 0,
        rolloverCredits: data.rollover_credits || 0,
        topupCredits: data.topup_credits || 0,
        lastDailyBonusAt: data.last_daily_bonus_at,
        canClaimDaily,
      });
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [user]);

  const claimDailyBonus = async () => {
    if (!user || claiming) return;

    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_daily_bonus", {
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = data?.[0];
      if (result?.success) {
        toast.success(`🎉 ${result.message}`, {
          description: `+${result.credits_added} credits added!`,
        });
        fetchCredits();
      } else {
        toast.info(result?.message || "Daily bonus not available");
      }
    } catch (error) {
      console.error("Error claiming bonus:", error);
      toast.error("Failed to claim daily bonus");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!credits) return null;

  const isLowBalance = credits.totalCredits < 10;
  const maxCredits = 500; // Estimated max for progress bar
  const progressPercent = Math.min(
    (credits.totalCredits / maxCredits) * 100,
    100
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 h-8 px-3 ${
            isLowBalance
              ? "text-amber-500 hover:text-amber-400"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Coins className="h-4 w-4" />
          <span className="font-medium">{credits.totalCredits.toFixed(0)}</span>
          {isLowBalance && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Low credit balance</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {credits.canClaimDaily && (
            <Badge
              variant="secondary"
              className="h-4 px-1 text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            >
              FREE
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Credit Balance</h4>
            <Badge variant="outline" className="font-mono">
              {credits.totalCredits.toFixed(1)}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {credits.totalCredits.toFixed(0)} credits remaining
            </p>
          </div>

          {/* Credit Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Monthly</span>
              <span className="font-mono">{credits.monthlyCredits.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Bonus</span>
              <span className="font-mono">{credits.bonusCredits.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Rollover</span>
              <span className="font-mono">{credits.rolloverCredits.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Top-up</span>
              <span className="font-mono">{credits.topupCredits.toFixed(1)}</span>
            </div>
          </div>

          {/* Daily Bonus */}
          {credits.canClaimDaily && (
            <Button
              onClick={claimDailyBonus}
              disabled={claiming}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              size="sm"
            >
              {claiming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              Claim Daily Bonus
            </Button>
          )}

          {/* Low Balance Warning */}
          {isLowBalance && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-amber-500">Low Balance</p>
                <p className="text-muted-foreground">
                  Consider upgrading your plan for more credits.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 bg-muted/50">
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <a href="/dashboard/billing">Upgrade Plan →</a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
