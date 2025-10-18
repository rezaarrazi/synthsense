import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, Users } from "lucide-react";

interface CreateCustomCohortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  availableQuota: number;
}

export const CreateCustomCohortDialog = ({
  open,
  onOpenChange,
  onSuccess,
  availableQuota,
}: CreateCustomCohortDialogProps) => {
  const [cohortName, setCohortName] = useState("");
  const [audienceDescription, setAudienceDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

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

    if (availableQuota < 100) {
      toast({
        title: "Insufficient quota",
        description: "You need at least 100 personas in your quota to create a custom cohort",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-custom-cohort', {
        body: {
          cohort_name: cohortName.trim(),
          audience_description: audienceDescription.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Cohort generation started",
        description: "Your custom cohort is being generated. This may take a few moments.",
      });

      setCohortName("");
      setAudienceDescription("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error generating cohort:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to start cohort generation",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
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
            AI will generate 100 unique personas and a cohort subtitle based on your audience description. This will use 100 from your quota.
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
              disabled={isGenerating}
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
              disabled={isGenerating}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {audienceDescription.length}/500 characters
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Available quota:</span>
              <span className={availableQuota >= 100 ? "text-primary" : "text-destructive"}>
                {availableQuota} personas
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Creating this cohort will use 100 personas from your quota
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating || availableQuota < 100}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
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
