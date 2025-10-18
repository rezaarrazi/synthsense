import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { IdeaInput } from "@/components/IdeaInput";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";

const Index = () => {
  const [currentExperimentId, setCurrentExperimentId] = useState<string | null>(null);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar onExperimentSelect={setCurrentExperimentId} />
        <main className="flex-1 flex flex-col">
          <header className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <SidebarTrigger className="md:hidden">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">SynthSense</h2>
              {currentExperimentId && (
                <span className="text-xs sm:text-sm bg-primary/10 text-primary px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                  Idea Testing
                </span>
              )}
            </div>
          </header>

          {currentExperimentId ? (
            <ResultsDashboard experimentId={currentExperimentId} onBack={() => setCurrentExperimentId(null)} />
          ) : (
            <IdeaInput onSubmit={setCurrentExperimentId} />
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;