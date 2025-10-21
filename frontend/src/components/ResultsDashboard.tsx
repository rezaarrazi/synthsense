import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, ThumbsUp, MessageSquare, Search, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonaDialog } from "./PersonaDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AuthDialog } from "./AuthDialog";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from '@apollo/client';
import { GET_EXPERIMENT_QUERY, GET_EXPERIMENT_RESPONSES_QUERY } from "@/graphql/queries";

interface Persona {
  id: string;
  name: string;
  title: string;
  income: string;
  age: number;
  location: string;
  avatar: string;
  sentiment: "adopt" | "mixed" | "not";
  tags: string[];
  response: string;
  persona_data: any;
  likert: number;
}

export const ResultsDashboard = ({ 
  experimentId, 
  onBack 
}: { 
  experimentId: string;
  onBack: () => void;
}) => {
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "adopt" | "mixed" | "not">("all");
  const [openAdopt, setOpenAdopt] = useState(true);
  const [openMixed, setOpenMixed] = useState(false);
  const [openNot, setOpenNot] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const { user } = useAuth();
  const [visibleCount, setVisibleCount] = useState(10);

  const [experiment, setExperiment] = useState<any>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch experiment data using GraphQL
  const { data: experimentData, loading: experimentLoading, error: experimentError } = useQuery(GET_EXPERIMENT_QUERY, {
    variables: {
      token: localStorage.getItem('access_token') || "",
      id: experimentId
    },
    skip: !experimentId || experimentId === 'guest-simulation'
  });

  // Fetch survey responses
  const { data: responsesData, loading: responsesLoading } = useQuery(GET_EXPERIMENT_RESPONSES_QUERY, {
    variables: {
      token: localStorage.getItem('access_token') || "",
      experimentId: experimentId
    },
    skip: !experimentId || experimentId === 'guest-simulation'
  });

  const loadGuestResults = () => {
    try {
      const guestDataStr = localStorage.getItem('guestSimulationResult');
      if (!guestDataStr) {
        setLoading(false);
        return;
      }

      const guestData = JSON.parse(guestDataStr);

      setExperiment({
        id: 'guest-simulation',
        ideaText: guestData.idea_text,
        recommendedNextStep: guestData.recommended_next_step,
        createdAt: new Date().toISOString(),
      });

      setPersonas(guestData.personas || []);
      setLoading(false);
    } catch (error) {
      console.error("Error loading guest results:", error);
      setLoading(false);
    }
  };

  const fetchExperimentData = useCallback(async () => {
    try {
      if (experimentData?.experiment && responsesData?.experimentResponses) {
        const exp = experimentData.experiment;
        setExperiment({
          id: exp.id,
          ideaText: exp.ideaText,
          recommendedNextStep: exp.recommendedNextStep,
          createdAt: exp.createdAt,
        });

        // Transform survey responses into personas
        const transformedPersonas: Persona[] = responsesData.experimentResponses.map((r: any) => {
          const personaData = r.persona?.personaData || {};
          const sentiment = r.likert >= 4 ? "adopt" : r.likert === 3 ? "mixed" : "not";
          
          // Use the actual persona name from the database
          const personaName = r.persona?.personaName || `Persona ${r.personaId.slice(-4)}`;
          
          return {
            id: r.personaId,
            name: personaName,
            title: personaData?.occupation || 'Unknown',
            income: personaData?.income_level || 'N/A',
            age: personaData?.age || 0,
            location: personaData?.city_country || personaData?.location || 'Unknown',
            avatar: personaName.substring(0, 2).toUpperCase(),
            sentiment,
            tags: [
              personaData?.sex,
              personaData?.age ? `${personaData.age} years old` : null,
              personaData?.education,
              personaData?.income_level ? `${personaData.income_level} income` : null,
              personaData?.relationship_status
            ].filter(Boolean),
            response: r.responseText,
            persona_data: personaData,
            likert: r.likert
          };
        });

        const sortedPersonas = [...transformedPersonas].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setPersonas(sortedPersonas);
      }
    } catch (error) {
      console.error("Error fetching experiment data:", error);
    } finally {
      setLoading(false);
    }
  }, [experimentData, responsesData]);

  useEffect(() => {
    if (experimentId === 'guest-simulation') {
      loadGuestResults();
    } else {
      fetchExperimentData();
    }
  }, [experimentId, experimentData, fetchExperimentData]);

  useEffect(() => {
    // Reset pagination when filter changes
    setVisibleCount(10);
  }, [activeFilter]);

  if (loading || experimentLoading || responsesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading results...</div>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Experiment not found</div>
      </div>
    );
  }

  const adoptCount = personas.filter(p => p.sentiment === "adopt").length;
  const mixedCount = personas.filter(p => p.sentiment === "mixed").length;
  const notCount = personas.filter(p => p.sentiment === "not").length;
  const totalCount = personas.length;
  const adoptPercent = totalCount > 0 ? Math.round((adoptCount / totalCount) * 100) : 0;

  const filteredPersonas = personas.filter(
    (p) => activeFilter === "all" || p.sentiment === activeFilter
  );
  const visiblePersonas = activeFilter === "all" ? filteredPersonas : filteredPersonas.slice(0, visibleCount);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-2 sm:mb-4"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Input
        </Button>

        {!user && (
          <div className="bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-primary" />
              </div>
        <div>
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Save your results & unlock unlimited simulations</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Create a free account to save this simulation and continue testing ideas</p>
              </div>
        </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => { setAuthMode("signin"); setAuthDialogOpen(true); }}
                className="flex-1 sm:flex-none text-sm"
                size="sm"
              >
                Sign In
          </Button>
              <Button 
                className="bg-primary hover:bg-primary/90 flex-1 sm:flex-none text-sm" 
                onClick={() => { setAuthMode("signup"); setAuthDialogOpen(true); }}
                size="sm"
              >
                Create Account
          </Button>
        </div>
      </div>
        )}

        <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-muted-foreground mb-2">{experiment.ideaText}</div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
                {adoptCount} of {totalCount} would try it{" "}
                <span className="text-muted-foreground">({adoptPercent}%)</span>
              </h2>
              <span className={`text-xs whitespace-nowrap ${adoptPercent >= 70 ? 'text-success' : adoptPercent >= 50 ? 'text-warning' : 'text-destructive'}`}>
                {adoptPercent >= 70 ? 'High' : adoptPercent >= 50 ? 'Medium' : 'Low'} confidence (n={totalCount})
              </span>
      </div>

            {totalCount > 0 && (
              <div className="flex gap-0 h-12 rounded-lg overflow-hidden">
                {adoptCount > 0 && (
                  <div
                    className="bg-success flex items-center justify-center text-success-foreground font-semibold"
                    style={{ width: `${(adoptCount / totalCount) * 100}%` }}
                  >
                    {adoptCount}
                  </div>
                )}
                {mixedCount > 0 && (
                  <div
                    className="bg-warning flex items-center justify-center text-warning-foreground font-semibold"
                    style={{ width: `${(mixedCount / totalCount) * 100}%` }}
                  >
                    {mixedCount}
              </div>
                )}
                {notCount > 0 && (
                  <div
                    className="bg-destructive flex items-center justify-center text-destructive-foreground font-semibold"
                    style={{ width: `${(notCount / totalCount) * 100}%` }}
                  >
                    {notCount}
              </div>
                )}
              </div>
            )}

            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" /> Would adopt
              </span>
              <span>• Mixed</span>
              <span>✕ Not interested</span>
            </div>
          </div>
        </div>

        {experiment.recommendedNextStep && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <button
              onClick={() => setShowRecommendation(!showRecommendation)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-semibold text-primary flex items-center gap-2">
                <span className="text-lg">▶</span> RECOMMENDED NEXT STEP
              </span>
              {showRecommendation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showRecommendation && (
              <p className="mt-3 text-sm text-foreground/90 leading-relaxed">
                {experiment.recommendedNextStep}
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={activeFilter === "all" ? "default" : "secondary"}
                size="sm"
                onClick={() => setActiveFilter("all")}
                className="text-xs sm:text-sm"
              >
                All {totalCount}
              </Button>
              <Button
                variant={activeFilter === "adopt" ? "default" : "secondary"}
                size="sm"
                onClick={() => setActiveFilter("adopt")}
                className={`text-xs sm:text-sm ${activeFilter === "adopt" ? "bg-success hover:bg-success/90" : ""}`}
              >
                <ThumbsUp className="h-3 w-3 mr-1" /> Adopt {adoptCount}
              </Button>
              <Button
                variant={activeFilter === "mixed" ? "default" : "secondary"}
                size="sm"
                onClick={() => setActiveFilter("mixed")}
                className={`text-xs sm:text-sm ${activeFilter === "mixed" ? "bg-warning hover:bg-warning/90" : ""}`}
              >
                • Mixed {mixedCount}
              </Button>
              <Button
                variant={activeFilter === "not" ? "default" : "secondary"}
                size="sm"
                onClick={() => setActiveFilter("not")}
                className={`text-xs sm:text-sm ${activeFilter === "not" ? "bg-destructive hover:bg-destructive/90" : ""}`}
              >
                ✕ Not {notCount}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 justify-center sm:justify-start">
              <MessageSquare className="h-4 w-4" /> Click to chat
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search personas..."
              className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2 text-sm"
            />
          </div>

          {activeFilter === "all" ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground mb-4">
                ALL PERSONAS • {totalCount}
      </div>

              <Collapsible open={openAdopt} onOpenChange={setOpenAdopt}>
                <CollapsibleTrigger className="w-full bg-success/10 hover:bg-success/15 border border-success/30 rounded-lg p-4 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <ThumbsUp className="h-5 w-5 text-success" />
                    <span className="font-semibold text-foreground">Would Adopt</span>
                    <span className="text-sm bg-success/20 text-success px-2 py-0.5 rounded-full">{adoptCount}</span>
                  </div>
                  {openAdopt ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 pl-4">
                  {personas.filter(p => p.sentiment === "adopt").map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersona(persona)}
                      className="w-full bg-card hover:bg-card/80 border border-border rounded-lg p-4 flex items-center justify-between transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                          {persona.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{persona.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {persona.title} • {persona.income}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {persona.age}y • {persona.location}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4 text-success" />
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={openMixed} onOpenChange={setOpenMixed}>
                <CollapsibleTrigger className="w-full bg-warning/10 hover:bg-warning/15 border border-warning/30 rounded-lg p-4 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-warning text-xl">•</span>
                    <span className="font-semibold text-foreground">Mixed</span>
                    <span className="text-sm bg-warning/20 text-warning px-2 py-0.5 rounded-full">{mixedCount}</span>
                  </div>
                  {openMixed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 pl-4">
                  {personas.filter(p => p.sentiment === "mixed").map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersona(persona)}
                      className="w-full bg-card hover:bg-card/80 border border-border rounded-lg p-4 flex items-center justify-between transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                          {persona.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{persona.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {persona.title} • {persona.income}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {persona.age}y • {persona.location}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-warning">•</span>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={openNot} onOpenChange={setOpenNot}>
                <CollapsibleTrigger className="w-full bg-destructive/10 hover:bg-destructive/15 border border-destructive/30 rounded-lg p-4 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-destructive text-xl">✕</span>
                    <span className="font-semibold text-foreground">Not Interested</span>
                    <span className="text-sm bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">{notCount}</span>
                  </div>
                  {openNot ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 pl-4">
                  {personas.filter(p => p.sentiment === "not").map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersona(persona)}
                      className="w-full bg-card hover:bg-card/80 border border-border rounded-lg p-4 flex items-center justify-between transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                          {persona.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{persona.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {persona.title} • {persona.income}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {persona.age}y • {persona.location}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-destructive">✕</span>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                ALL PERSONAS • {filteredPersonas.length}
              </div>
              
              <div className="space-y-2">
                {visiblePersonas.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona)}
                    className="w-full bg-card hover:bg-card/80 border border-border rounded-lg p-4 flex items-center justify-between transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                        {persona.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{persona.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {persona.title} • {persona.income}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {persona.age}y • {persona.location}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {persona.sentiment === "adopt" && <ThumbsUp className="h-4 w-4 text-success" />}
                      {persona.sentiment === "mixed" && <span className="text-warning">•</span>}
                      {persona.sentiment === "not" && <span className="text-destructive">✕</span>}
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
                  </div>
              {filteredPersonas.length > visibleCount && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setVisibleCount((c) => c + 10)}
                  >
                    See more
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-center mt-8">
          <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={onBack}>
            Run New Simulation
          </Button>
        </div>

        {!user && (
          <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-8 mt-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Continue Testing Your Ideas</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                You've used your free trial. Sign up to continue using SynthSense and save your simulation results.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setAuthMode("signin"); setAuthDialogOpen(true); }}>
                  Sign In
                </Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={() => { setAuthMode("signup"); setAuthDialogOpen(true); }}>
                  Create Free Account
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

        {selectedPersona && (
          <PersonaDialog
            persona={selectedPersona}
            onClose={() => setSelectedPersona(null)}
            experimentId={experimentId}
            isGuest={experimentId === 'guest-simulation'}
            onAuthRequired={() => {
              setSelectedPersona(null);
              setAuthMode("signup");
              setAuthDialogOpen(true);
            }}
          />
        )}
      
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultMode={authMode}
      />
    </div>
  );
};