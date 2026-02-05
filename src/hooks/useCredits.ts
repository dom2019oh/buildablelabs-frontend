import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export type CreditActionType = 
  | 'question_answer'
  | 'page_creation'
  | 'component_generation'
  | 'code_export'
  | 'ai_chat'
  | 'image_generation'
  | 'deployment';

export interface UserCredits {
  id: string;
  user_id: string;
  monthly_credits: number;
  bonus_credits: number;
  rollover_credits: number;
  topup_credits: number;
  last_daily_bonus_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_type: 'free' | 'pro' | 'business' | 'enterprise';
  selected_credits: number;
  price_cents: number;
  billing_period_start: string;
  billing_period_end: string;
  is_annual: boolean;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  action_type: CreditActionType | null;
  amount: number;
  balance_after: number;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreditActionCost {
  action_type: CreditActionType;
  credit_cost: number;
  description: string;
}

export function useCredits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's current credits
  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["user-credits", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as UserCredits | null;
    },
    enabled: !!user?.id,
  });

  // Fetch user's subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["user-subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as UserSubscription | null;
    },
    enabled: !!user?.id,
  });

  // Fetch credit transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["credit-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: !!user?.id,
  });

  // Fetch action costs (public)
  const { data: actionCosts } = useQuery({
    queryKey: ["credit-action-costs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_action_costs")
        .select("action_type, credit_cost, description");
      
      if (error) throw error;
      return data as CreditActionCost[];
    },
  });

  // Calculate total credits
  const totalCredits = credits
    ? Number(credits.monthly_credits) + 
      Number(credits.bonus_credits) + 
      Number(credits.rollover_credits) + 
      Number(credits.topup_credits)
    : 0;

  // Deduct credits mutation
  const deductCreditsMutation = useMutation({
    mutationFn: async ({ 
      actionType, 
      description, 
      metadata 
    }: { 
      actionType: CreditActionType; 
      description?: string; 
      metadata?: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { data, error } = await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_action_type: actionType,
        p_description: description || null,
        p_metadata: JSON.parse(JSON.stringify(metadata || {})),
      });
      
      if (error) throw error;
      return data as { success: boolean; message: string; remaining_credits: number }[];
    },
    onSuccess: (data) => {
      const result = data?.[0];
      if (result?.success) {
        queryClient.invalidateQueries({ queryKey: ["user-credits"] });
        queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
      } else {
        toast({
          title: "Insufficient Credits",
          description: result?.message || "You don't have enough credits for this action.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Claim daily bonus mutation
  const claimDailyBonusMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { data, error } = await supabase.rpc("claim_daily_bonus", {
        p_user_id: user.id,
      });
      
      if (error) throw error;
      return data as { success: boolean; message: string; credits_added: number }[];
    },
    onSuccess: (data) => {
      const result = data?.[0];
      if (result?.success) {
        queryClient.invalidateQueries({ queryKey: ["user-credits"] });
        queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
        toast({
          title: "Daily Bonus Claimed!",
          description: `You received ${result.credits_added} bonus credits.`,
        });
      } else {
        toast({
          title: "Daily Bonus",
          description: result?.message || "Daily bonus not available.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if user can perform an action
  const canPerformAction = (actionType: CreditActionType): boolean => {
    const cost = actionCosts?.find((c) => c.action_type === actionType)?.credit_cost || 0;
    return totalCredits >= cost;
  };

  // Get cost for an action
  const getActionCost = (actionType: CreditActionType): number => {
    return actionCosts?.find((c) => c.action_type === actionType)?.credit_cost || 0;
  };

  // Check if daily bonus is available
  const canClaimDailyBonus = (): boolean => {
    if (!credits?.last_daily_bonus_at) return true;
    const lastBonus = new Date(credits.last_daily_bonus_at);
    const today = new Date();
    return lastBonus.toDateString() !== today.toDateString();
  };

  return {
    credits,
    subscription,
    transactions,
    actionCosts,
    totalCredits,
    isLoading: creditsLoading || subscriptionLoading,
    transactionsLoading,
    deductCredits: deductCreditsMutation.mutate,
    deductCreditsAsync: deductCreditsMutation.mutateAsync,
    isDeducting: deductCreditsMutation.isPending,
    claimDailyBonus: claimDailyBonusMutation.mutate,
    isClaimingBonus: claimDailyBonusMutation.isPending,
    canPerformAction,
    getActionCost,
    canClaimDailyBonus,
  };
}
