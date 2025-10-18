import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "signup" | "signin";
  message?: string;
}

export const AuthDialog = ({ open, onOpenChange, defaultMode = "signup", message }: AuthDialogProps) => {
  const [mode, setMode] = useState<"signup" | "signin">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signup, login } = useAuth();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signup") {
        await signup(email, password, fullName || undefined);
        
        // Clear guest data on successful signup
        localStorage.removeItem('guestSimulationResult');
        localStorage.removeItem('synthsense_guest_used');
        localStorage.removeItem('synthsense_guest_timestamp');

        toast({
          title: "Account created!",
          description: "You can now start using SynthSense.",
        });
        onOpenChange(false);
      } else {
        await login(email, password);
        
        // Clear guest data on successful signin
        localStorage.removeItem('guestSimulationResult');
        localStorage.removeItem('synthsense_guest_used');
        localStorage.removeItem('synthsense_guest_timestamp');

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during authentication",
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
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Continue"} →
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
