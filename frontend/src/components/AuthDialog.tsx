import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from '@apollo/client';
import { SAVE_GUEST_SIMULATION_MUTATION } from "@/graphql/queries";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "signup" | "signin";
  message?: string;
  onAuthComplete?: (callback: () => void) => void;
}

export const AuthDialog = ({ open, onOpenChange, defaultMode = "signup", message, onAuthComplete }: AuthDialogProps) => {
  const [mode, setMode] = useState<"signup" | "signin">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authCompleted, setAuthCompleted] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading, signup, login } = useAuth();
  
  // Mutation to save guest simulation
  const [saveGuestSimulation] = useMutation(SAVE_GUEST_SIMULATION_MUTATION);

  // Function to save guest simulation to database
  const saveGuestSimulationToDatabase = useCallback(async () => {
    try {
      const guestDataStr = localStorage.getItem('guestSimulationResult');
      if (!guestDataStr) return null;

      const guestData = JSON.parse(guestDataStr);
      const token = localStorage.getItem('access_token');
      
      if (!token) return null;

      const { data } = await saveGuestSimulation({
        variables: {
          token,
          guestData: {
            ideaText: guestData.ideaText,
            questionText: "Based on this information, how likely are you to purchase this product?",
            personas: guestData.personas,
            responses: guestData.responses,
            sentimentBreakdown: guestData.sentimentBreakdown,
            propertyDistributions: guestData.propertyDistributions,
            recommendation: guestData.recommendation,
            title: guestData.title
          }
        }
      });

      return data?.saveGuestSimulation;
    } catch (error) {
      console.error('Failed to save guest simulation:', error);
      return null;
    }
  }, [saveGuestSimulation]);

  // Close dialog when user is authenticated and not loading
  useEffect(() => {
    if (authCompleted && user && !authLoading) {
      if (onAuthComplete) {
        // Save guest simulation before clearing localStorage
        saveGuestSimulationToDatabase().then((savedExperiment) => {
          // Wait for IdeaInput to confirm UI is ready
          onAuthComplete(() => {
            onOpenChange(false);
            setAuthCompleted(false);
            // Reset form
            setEmail("");
            setPassword("");
            setFullName("");
            
            // Clear guest data after successful save
            localStorage.removeItem('guestSimulationResult');
            localStorage.removeItem('synthsense_guest_used');
            localStorage.removeItem('synthsense_guest_timestamp');
            
            if (savedExperiment) {
              toast({
                title: "Simulation saved!",
                description: "Your guest simulation has been saved to your account.",
              });
            }
          });
        }).catch((error) => {
          console.error('Error saving guest simulation:', error);
          // Still proceed with auth completion even if save fails
          onAuthComplete(() => {
            onOpenChange(false);
            setAuthCompleted(false);
            setEmail("");
            setPassword("");
            setFullName("");
          });
        });
      } else {
        // Fallback: close immediately if no callback provided
        onOpenChange(false);
        setAuthCompleted(false);
        // Reset form
        setEmail("");
        setPassword("");
        setFullName("");
      }
    }
  }, [authCompleted, user, authLoading, onOpenChange, onAuthComplete, saveGuestSimulationToDatabase, toast]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signup") {
        await signup(email, password, fullName || undefined);
        
        toast({
          title: "Account created!",
          description: "You can now start using SynthSense.",
        });
        setAuthCompleted(true);
      } else {
        await login(email, password);
        
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        setAuthCompleted(true);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred during authentication";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </DialogTitle>
          
          {message && (
            <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-center text-sm text-foreground">
                {message}
              </p>
            </div>
          )}
          
          <p className="text-center text-muted-foreground text-sm">
            {mode === "signup" 
              ? "Welcome! Please fill in the details to get started."
              : "Sign in to continue to SynthSense"}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm">
                  Full name <span className="text-muted-foreground">Optional</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-secondary border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading || authCompleted}
            >
              {authCompleted ? "Completing..." : isLoading ? "Loading..." : "Continue"} →
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
              </span>
              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="text-primary hover:underline"
              >
                {mode === "signup" ? "Sign in" : "Sign up"}
              </button>
            </div>
          </form>

          <div className="text-center text-xs text-muted-foreground">
            Secured by SynthSense
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
