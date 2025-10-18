import { useQuery } from '@apollo/client';
import { GET_EXPERIMENTS_QUERY } from '../graphql/queries';
import { useAuth } from './useAuth';

interface Experiment {
  id: string;
  idea_text: string;
  title: string;
  created_at: string;
  status: string;
  results_summary?: any;
}

export const useExperiments = () => {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_EXPERIMENTS_QUERY, {
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
