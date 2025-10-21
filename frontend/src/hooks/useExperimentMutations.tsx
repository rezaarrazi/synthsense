import { useMutation } from '@apollo/client';
import { DELETE_EXPERIMENT_MUTATION, UPDATE_EXPERIMENT_TITLE_MUTATION } from '@/graphql/queries';
import { toast } from 'sonner';

export const useExperimentMutations = () => {
  const [deleteExperimentMutation] = useMutation(DELETE_EXPERIMENT_MUTATION);
  const [updateExperimentTitleMutation] = useMutation(UPDATE_EXPERIMENT_TITLE_MUTATION);

  const deleteExperiment = async (experimentId: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Authentication required');
        return false;
      }

      await deleteExperimentMutation({
        variables: {
          token,
          experimentId
        }
      });

      toast.success('Experiment deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting experiment:', error);
      toast.error('Failed to delete experiment');
      return false;
    }
  };

  const updateExperimentTitle = async (experimentId: string, title: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Authentication required');
        return false;
      }

      await updateExperimentTitleMutation({
        variables: {
          token,
          experimentId,
          title
        }
      });

      toast.success('Experiment renamed successfully');
      return true;
    } catch (error) {
      console.error('Error updating experiment title:', error);
      toast.error('Failed to rename experiment');
      return false;
    }
  };

  return {
    deleteExperiment,
    updateExperimentTitle
  };
};
