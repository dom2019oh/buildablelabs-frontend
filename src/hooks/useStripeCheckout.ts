import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export interface CreditTierWithStripe {
  id: string;
  plan_type: "free" | "pro" | "business" | "enterprise";
  credits: number;
  price_cents: number;
  is_popular: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

export function useStripeCheckout() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const startCheckout = async (priceId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to subscribe.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.shouldUsePortal) {
        toast({
          title: "Active Subscription",
          description: "You already have an active subscription. Opening billing portal...",
        });
        await openBillingPortal();
        return;
      }

      if (data?.url) {
        // Open in new tab
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start checkout";
      toast({
        title: "Checkout Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openBillingPortal = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to manage your subscription.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("billing-portal");

      if (error) {
        throw new Error(error.message);
      }

      if (data?.noSubscription) {
        toast({
          title: "No Subscription",
          description: "You don't have an active subscription yet.",
        });
        return;
      }

      if (data?.url) {
        // Open in new tab
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open billing portal";
      toast({
        title: "Portal Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    startCheckout,
    openBillingPortal,
    isLoading,
  };
}
