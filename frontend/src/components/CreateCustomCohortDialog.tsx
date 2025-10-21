import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, gql } from '@apollo/client';
import { GENERATE_CUSTOM_COHORT_MUTATION } from '@/graphql/queries';
import { Loader2, Sparkles } from "lucide-react";

interface CreateCustomCohortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateCustomCohortDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateCustomCohortDialogProps) => {
  const [cohortName, setCohortName] = useState("");
  const [audienceDescription, setAudienceDescription] = useState("");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();

  const [generateCustomCohort, { loading: isGenerating }] = useMutation(GENERATE_CUSTOM_COHORT_MUTATION);

  // Poll job status when we have a job ID
  const GET_PERSONA_GENERATION_JOB = gql`
    query GetPersonaGenerationJob($token: String!, $id: ID!) {
      personaGenerationJob(token: $token, id: $id) {
        id
        status
        personasGenerated
        totalPersonas
        errorMessage
      }
    }
  `;

  const { data: jobData, stopPolling, error: jobError } = useQuery(GET_PERSONA_GENERATION_JOB, {
    variables: { 
      token: localStorage.getItem('access_token') || '',
      id: currentJobId 
    },
    skip: !currentJobId,
    pollInterval: 2000, // Poll every 2 seconds
    onCompleted: (data) => {
      console.log('Job polling completed:', data);
      if (data?.personaGenerationJob) {
        const job = data.personaGenerationJob;
        console.log('Job status:', job.status, 'Personas generated:', job.personasGenerated);
        
        if (job.status === 'completed') {
          stopPolling();
          setCurrentJobId(null);
          toast({
            title: "Cohort created successfully!",
            description: `Generated ${job.personasGenerated} personas for "${cohortName}".`,
          });
          setCohortName("");
          setAudienceDescription("");
          onOpenChange(false);
          onSuccess();
        } else if (job.status === 'failed') {
          stopPolling();
          setCurrentJobId(null);
          toast({
            title: "Cohort generation failed",
            description: job.errorMessage || "Failed to generate personas",
            variant: "destructive",
          });
        }
      } else {
        console.log('No job data found in response');
      }
    },
    onError: (error) => {
      console.error('Job polling error:', error);
    },
  });

  // Handle job completion via useEffect as backup
  useEffect(() => {
    if (jobData?.personaGenerationJob && currentJobId) {
      const job = jobData.personaGenerationJob;
      console.log('useEffect: Job status:', job.status, 'Personas generated:', job.personasGenerated);
      
      if (job.status === 'completed') {
        console.log('useEffect: Triggering completion logic');
        stopPolling();
        setCurrentJobId(null);
        
        // Show success toast
        toast({
          title: "Cohort created successfully!",
          description: `Generated ${job.personasGenerated} personas for "${cohortName}".`,
        });
        
        // Reset form and close dialog
        setCohortName("");
        setAudienceDescription("");
        onOpenChange(false);
        onSuccess();
        
        console.log('useEffect: Completion logic executed');
      } else if (job.status === 'failed') {
        console.log('useEffect: Triggering failure logic');
        stopPolling();
        setCurrentJobId(null);
        toast({
          title: "Cohort generation failed",
          description: job.errorMessage || "Failed to generate personas",
          variant: "destructive",
        });
      }
    }
  }, [jobData, currentJobId, stopPolling, cohortName, onOpenChange, onSuccess, toast]);

  // Cleanup polling when dialog closes
  useEffect(() => {
    if (!open && currentJobId) {
      stopPolling();
      setCurrentJobId(null);
    }
  }, [open, currentJobId, stopPolling]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cohortName.trim()) {
      toast({
        title: "Cohort name required",
        description: "Please enter a name for your cohort",
        variant: "destructive",
      });
      return;
    }

    if (cohortName.length > 50) {
      toast({
        title: "Name too long",
        description: "Cohort name must be 50 characters or less",
        variant: "destructive",
      });
      return;
    }

    if (!audienceDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please describe your target audience",
        variant: "destructive",
      });
      return;
    }

    if (audienceDescription.length > 500) {
      toast({
        title: "Description too long",
        description: "Audience description must be 500 characters or less",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data } = await generateCustomCohort({
        variables: {
          cohortData: {
            personaGroup: cohortName.trim(),
            audienceDescription: audienceDescription.trim(),
          },
        },
      });

      if (data?.generateCustomCohort) {
        // Set the job ID to start polling
        console.log('Job created with ID:', data.generateCustomCohort.id);
        setCurrentJobId(data.generateCustomCohort.id);
        
        toast({
          title: "Cohort generation started",
          description: "Your custom cohort is being generated. This may take a few moments.",
        });

        // Don't close dialog yet - wait for completion
        // Don't reset form yet - wait for completion
      }
    } catch (error) {
      console.error('Error generating cohort:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to start cohort generation",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Custom Cohort
          </DialogTitle>
          <DialogDescription>
            AI will generate 100 unique personas and a cohort subtitle based on your audience description.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cohort-name">Cohort Name</Label>
            <Input
              id="cohort-name"
              placeholder="e.g., Tech Enthusiasts"
              value={cohortName}
              onChange={(e) => setCohortName(e.target.value)}
              maxLength={50}
              disabled={isGenerating || !!currentJobId}
            />
            <p className="text-xs text-muted-foreground">
              {cohortName.length}/50 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience-description">Audience Description</Label>
            <Textarea
              id="audience-description"
              placeholder="Describe your target audience in detail. E.g., 'Young professionals aged 25-35 who are interested in sustainable technology and work in urban areas...'"
              value={audienceDescription}
              onChange={(e) => setAudienceDescription(e.target.value)}
              maxLength={500}
              rows={5}
              disabled={isGenerating || !!currentJobId}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {audienceDescription.length}/500 characters
            </p>
          </div>


          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating || !!currentJobId}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating || !!currentJobId}>
              {isGenerating || currentJobId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentJobId ? "Generating..." : "Starting..."}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Cohort
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
