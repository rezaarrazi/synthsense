import { useState } from "react";
import { useMutation, useQuery } from '@apollo/client';
import { RUN_SIMULATION_MUTATION, GET_PERSONA_GROUPS_QUERY } from '../graphql/queries';
import { useAuth } from './useAuth';
import { useToast } from "@/hooks/use-toast";

interface SimulationResult {
  experimentId: string;
  status: string;
  totalProcessed: number;
  totalPersonas: number;
  sentimentBreakdown?: {
    adopt: { count: number; percentage: string };
    mixed: { count: number; percentage: string };
    not: { count: number; percentage: string };
  };
  propertyDistributions?: any;
  recommendation?: string;
  title?: string;
}

const GUEST_USAGE_KEY = 'synthsense_guest_used';
const GUEST_TIMESTAMP_KEY = 'synthsense_guest_timestamp';
const GUEST_RESULT_KEY = 'guestSimulationResult';

export const hasUsedGuestMode = () => {
  return localStorage.getItem(GUEST_USAGE_KEY) === 'true';
};

const markGuestModeUsed = () => {
  localStorage.setItem(GUEST_USAGE_KEY, 'true');
  localStorage.setItem(GUEST_TIMESTAMP_KEY, Date.now().toString());
};

export const useSimulation = (onAuthRequired?: () => void) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Get persona groups
  const { data: personaGroupsData, loading: groupsLoading } = useQuery(GET_PERSONA_GROUPS_QUERY, {
    skip: !user,
  });

  // Run simulation mutation
  const [runSimulationMutation] = useMutation(RUN_SIMULATION_MUTATION, {
    onCompleted: (data) => {
      setResult(data.runSimulation);
      setIsRunning(false);
      toast({
        title: "Simulation complete!",
        description: `Processed ${data.runSimulation.totalProcessed} personas successfully`,
      });
    },
    onError: (error) => {
      console.error('Simulation error:', error);
      setIsRunning(false);
      toast({
        title: "Simulation failed",
        description: error.message || "An error occurred during simulation",
        variant: "destructive",
      });
    }
  });

  const runSimulation = async (
    ideaText: string,
    personaGroup: string = "General Audience"
  ): Promise<SimulationResult | null> => {
    if (!user) {
      if (onAuthRequired) {
        onAuthRequired();
      }
      return null;
    }

    setIsRunning(true);
    setProgress(0);
    setResult(null);

    try {
      await runSimulationMutation({
        variables: {
          experimentData: {
            ideaText,
            personaGroup,
            questionText: "Based on this information, how likely are you to purchase this product?"
          }
        }
      });
    } catch (error) {
      setIsRunning(false);
      return null;
    }

    return result;
  };

  const runGuestSimulation = async (ideaText: string): Promise<SimulationResult | null> => {
    setIsRunning(true);
    setProgress(0);

    try {
      // For guest simulation, we'll use a mock result since we don't have guest endpoints
      // In a real implementation, you might want to create a guest simulation endpoint
      const mockResult: SimulationResult = {
        experimentId: 'guest-simulation',
        status: 'completed',
        totalProcessed: 10,
        totalPersonas: 10,
        sentimentBreakdown: {
          adopt: { count: 3, percentage: "30.0" },
          mixed: { count: 4, percentage: "40.0" },
          not: { count: 3, percentage: "30.0" }
        },
        propertyDistributions: {},
        recommendation: "This is a guest simulation result. Sign up to get full analysis.",
        title: "Guest Simulation"
      };

      // Mark guest mode as used
      markGuestModeUsed();

      // Store results in localStorage
      localStorage.setItem(GUEST_RESULT_KEY, JSON.stringify(mockResult));

      toast({
        title: "Simulation complete!",
        description: `Processed ${mockResult.totalProcessed} personas successfully`,
      });

      return mockResult;
    } catch (error) {
      console.error("Unexpected guest simulation error:", error);
      toast({
        title: "Simulation failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsRunning(false);
      setProgress(0);
    }
  };

  const personaGroups: string[] = personaGroupsData?.personaGroups || [];

  return {
    runSimulation,
    runGuestSimulation,
    isRunning,
    progress,
    result,
    personaGroups,
    isLoadingGroups: groupsLoading,
  };
};
