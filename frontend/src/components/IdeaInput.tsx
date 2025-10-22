import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Loader2 } from "lucide-react";
import { EXAMPLE_IDEAS } from "@/constants/exampleIdeas";
import { AuthDialog } from "@/components/AuthDialog";
import { PersonaGroupSelect } from "@/components/PersonaGroupSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useSimulation, hasUsedGuestMode } from "@/hooks/useSimulation";

export const IdeaInput = ({ onSubmit }: { onSubmit: (experimentId: string) => void }) => {
  const [idea, setIdea] = useState("");
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [personaGroup, setPersonaGroup] = useState("General Audience");
  const [personaCount, setPersonaCount] = useState(0);
  const [personaGroupReady, setPersonaGroupReady] = useState(false);
  const { user, loading: authLoading } = useAuth();
  
  const { runSimulation, runGuestSimulation, isRunning } = useSimulation(() => {
    setAuthDialogOpen(true);
  });

  // Handle auth state changes
  useEffect(() => {
    if (!authLoading && user) {
      setPersonaGroupReady(true);
    } else if (!authLoading && !user) {
      setPersonaGroupReady(false);
    }
  }, [authLoading, user]);

  const handleSubmit = async () => {
    if (idea.trim() && !isRunning) {
      if (user) {
        // Authenticated user - normal flow
        const result = await runSimulation(idea, personaGroup);
        if (result) {
          onSubmit(result.experimentId);
        }
      } else {
        // Guest user - check if they've used their trial
        if (hasUsedGuestMode()) {
          setAuthDialogOpen(true);
          return;
        }
        
        // First time guest - run guest simulation
        const result = await runGuestSimulation(idea);
        if (result) {
          onSubmit('guest-simulation');
        }
      }
    }
  };

  const onAuthComplete = () => {
    setAuthDialogOpen(false);
    // The personaGroupReady will be set by the useEffect above
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-3xl w-full space-y-6 sm:space-y-8">
        <div className="space-y-2 sm:space-y-3 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Test your idea with AI personas
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Get realistic feedback from simulated users matching your target audience
          </p>
        </div>

        <div className="relative">
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Example: An app that turns meeting notes into action items automatically. Price: $19/month for teams."
            className="min-h-[160px] sm:min-h-[200px] text-sm sm:text-base bg-card border-border resize-none pr-3 pb-20 sm:pb-14"
          />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
              {!user && (
                <span className="text-primary font-semibold text-xs bg-primary/10 px-2 py-1 rounded">
                  Free Trial - 1 simulation
                </span>
              )}
              {user && (
                <>
                  <span>AUDIENCE</span>
                  <PersonaGroupSelect value={personaGroup} onChange={setPersonaGroup} onCountChange={setPersonaCount} />
                  <div className="hidden sm:flex items-center gap-2">
                    <span>SIZE</span>
                    <span className="text-foreground font-medium">{personaCount} personas</span>
                  </div>
                </>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              size="icon"
              disabled={isRunning || !idea.trim()}
              className="rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"
            >
              {isRunning ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap justify-center">
            {Object.entries(EXAMPLE_IDEAS).map(([label, value]) => (
              <button
                key={label}
                onClick={() => setIdea(value)}
                className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-foreground transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AuthDialog 
        open={authDialogOpen} 
        onOpenChange={setAuthDialogOpen}
        message={hasUsedGuestMode() 
          ? "You've used your free trial. Sign up to continue testing ideas!" 
          : "Sign up to test your idea with AI personas and get instant feedback"}
      />
    </div>
  );
};