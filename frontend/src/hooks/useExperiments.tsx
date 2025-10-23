import { useQuery } from '@apollo/client';
import { GET_EXPERIMENTS_QUERY } from '../graphql/queries';
import { useAuth } from '@/contexts/AuthContext';

interface Experiment {
  id: string;
  ideaText: string;
  title: string;
  createdAt: string;
  status: string;
  resultsSummary?: any;
}

export const useExperiments = () => {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_EXPERIMENTS_QUERY, {
    variables: {
      token: localStorage.getItem('access_token') || "",
      status: "completed" // Only fetch completed experiments
    },
    skip: !user,
    pollInterval: 5000, // Poll every 5 seconds for updates
  });

  const experiments: Experiment[] = data?.experiments || [];

  return { 
    experiments, 
    isLoading: loading,
    error,
    refetch 
  };
};
