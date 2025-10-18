import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PurchasePersonasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
}

export const PurchasePersonasDialog = ({
  open,
  onOpenChange,
  currentBalance,
}: PurchasePersonasDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to purchase personas.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl font-bold text-foreground">
            Purchase Personas
          </DialogTitle>
          <p className="text-muted-foreground mt-1">
            Add credits to continue testing
          </p>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Current Balance */}
          <div className="bg-background border border-border rounded-lg p-4 flex items-center justify-between">
            <span className="text-muted-foreground">Current balance</span>
            <span className="text-foreground font-semibold text-lg">
              {currentBalance} personas
            </span>
          </div>

          {/* Pricing Card */}
          <div className="bg-background border border-border rounded-lg p-6 space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-5xl font-bold text-foreground">$15</div>
                <div className="text-muted-foreground text-sm mt-1">
                  one-time purchase
                </div>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-foreground">1,000</div>
                <div className="text-muted-foreground text-sm mt-1">
                  personas
                </div>
              </div>
            </div>

            {/* Features List */}
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                <span>1,000 AI personas for testing</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                <span>Credits never expire</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                <span>Run 10-40 simulations</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                <span>Secure payment via Stripe</span>
              </li>
            </ul>
          </div>

          {/* Checkout Button */}
          <Button
            onClick={handleCheckout}
            className="w-full h-12 text-base font-medium"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Continue to Checkout"
            )}
          </Button>

          {/* Disclaimer */}
          <p className="text-center text-sm text-muted-foreground">
            Credits will be added to your account immediately after successful
            payment
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
