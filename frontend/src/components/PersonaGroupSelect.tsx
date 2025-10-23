import { useState, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from '@apollo/client';
import { GET_PERSONA_GROUPS_QUERY, DELETE_COHORT_MUTATION } from '../graphql/queries';
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "./ui/input";
import { CreateCustomCohortDialog } from "./CreateCustomCohortDialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PersonaGroupOption {
  value: string;
  label: string;
  description: string;
  count?: number;
}

interface PersonaGroupSelectProps {
  value: string;
  onChange: (value: string) => void;
  onCountChange?: (count: number) => void;
  onReady?: () => void;
}

export const PersonaGroupSelect = ({ value, onChange, onCountChange, onReady }: PersonaGroupSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState<PersonaGroupOption[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cohortToDelete, setCohortToDelete] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Reset component state when user changes
  useEffect(() => {
    if (!user) {
      setOptions([]);
      setIsOpen(false);
      setSearchQuery("");
    }
  }, [user]);

  // Get persona groups using GraphQL with polling
  const { data: personaGroupsData, loading: groupsLoading, refetch } = useQuery(GET_PERSONA_GROUPS_QUERY, {
    skip: !user,
    pollInterval: 10000, // Poll every 10 seconds for updates (less frequent than experiments)
    fetchPolicy: 'cache-and-network', // Always fetch fresh data but use cache while loading
  });

  // Refetch persona groups immediately when user logs in
  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);

  const [deleteCohort, { loading: isDeleting, data: deleteData, error: deleteError }] = useMutation(DELETE_COHORT_MUTATION, {
    refetchQueries: [GET_PERSONA_GROUPS_QUERY],
  });

  // Handle delete completion
  useEffect(() => {
    if (deleteData) {
      toast({
        title: "Cohort deleted",
        description: "The cohort has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
      setCohortToDelete(null);
    }
  }, [deleteData, toast]);

  // Handle delete errors
  useEffect(() => {
    if (deleteError) {
      toast({
        title: "Delete failed",
        description: deleteError.message || "Failed to delete cohort",
        variant: "destructive",
      });
    }
  }, [deleteError, toast]);

  useEffect(() => {
    if (personaGroupsData?.personaGroups) {
      const groupOptions: PersonaGroupOption[] = personaGroupsData.personaGroups.map((group: { name: string; count: number }) => ({
        value: group.name,
        label: group.name,
        description: group.name === 'General Audience' ? 'Broad market testing' : 'Custom cohort',
        count: group.count,
      }));

      setOptions(groupOptions);
    }
  }, [personaGroupsData]);

  const selectedOption = useMemo(() => 
    options.find(opt => opt.value === value) || options[0] || {
      value: 'General Audience',
      label: 'General Audience',
      description: 'Broad market testing',
      count: 50
    }, [options, value]
  );

  useEffect(() => {
    if (selectedOption && onCountChange && selectedOption.count !== undefined) {
      onCountChange(selectedOption.count);
    }
  }, [selectedOption, onCountChange]);

  // Notify parent when component is ready (not loading and has options, or user is null)
  useEffect(() => {
    if ((!groupsLoading && options.length > 0) || !user) {
      if (onReady) {
        onReady();
      }
    }
  }, [groupsLoading, options.length, onReady, user]);

  // Also notify when we have cached data (for immediate updates)
  useEffect(() => {
    if (personaGroupsData?.personaGroups && personaGroupsData.personaGroups.length > 0 && user) {
      if (onReady) {
        onReady();
      }
    }
  }, [personaGroupsData, onReady, user]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (e: React.MouseEvent, cohortName: string) => {
    e.stopPropagation();
    setCohortToDelete(cohortName);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (cohortToDelete) {
      deleteCohort({
        variables: { personaGroup: cohortToDelete }
      });
    }
  };

  const isCustomCohort = (cohortName: string) => {
    return cohortName !== 'General Audience';
  };

  // Don't render anything if user is not authenticated
  if (!user) {
    return null;
  }

  // Show default state immediately, don't wait for GraphQL query
  // This prevents the delay in IdeaInput during sign-in
  if (options.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2.5 text-foreground min-w-[200px] justify-between">
        <span className="text-sm font-medium">General Audience</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2.5 text-foreground hover:bg-accent/50 transition-colors min-w-[200px] justify-between"
      >
        <span className="text-sm font-medium">{selectedOption.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cohorts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {filteredOptions.length > 0 ? (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Presets
                  </div>
                  {filteredOptions.map((option) => (
                    <div
                      key={option.value}
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors flex items-start gap-3 group relative",
                        value === option.value && "bg-accent/30"
                      )}
                    >
                      <button
                        onClick={() => {
                          onChange(option.value);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className="flex-1 flex items-start gap-3"
                      >
                        <div className="flex-1 text-left">
                          <div className="font-medium text-foreground">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                        {value === option.value && (
                          <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        )}
                      </button>
                      {isCustomCohort(option.value) && (
                        <button
                          onClick={(e) => handleDeleteClick(e, option.value)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded-sm"
                          title="Delete cohort"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No cohorts found
                </div>
              )}
            </div>
            
            <div className="border-t border-border">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery("");
                  setShowCreateDialog(true);
                }}
                className="w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors flex items-start gap-3"
              >
                <Plus className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Create custom cohort</div>
                  <div className="text-sm text-muted-foreground">AI-generated personas for your audience</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
      
      <CreateCustomCohortDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          // Refresh the persona groups query
          window.location.reload(); // Simple refresh for now
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cohort</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{cohortToDelete}"? This will permanently delete all personas in this cohort and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};