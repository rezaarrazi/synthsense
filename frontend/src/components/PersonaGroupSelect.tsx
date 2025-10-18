import { useState, useEffect } from "react";
import { Check, ChevronDown, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CreateCustomCohortDialog } from "./CreateCustomCohortDialog";
import { Input } from "./ui/input";

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
}

export const PersonaGroupSelect = ({ value, onChange, onCountChange }: PersonaGroupSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [availableQuota, setAvailableQuota] = useState(0);
  const [options, setOptions] = useState<PersonaGroupOption[]>([
    {
      value: "Default",
      label: "General Audience",
      description: "Broad market testing",
      count: 50,
    }
  ]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPersonaGroups = async () => {
      if (!user) return;

      // Fetch quota
      const { data: profileData } = await supabase
        .from('profiles')
        .select('persona_quota, additional_quota')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setAvailableQuota(profileData.persona_quota + profileData.additional_quota);
      }

      // Fetch persona groups from persona_generation_jobs with short_description
      const { data: jobs, error: jobsError } = await supabase
        .from('persona_generation_jobs')
        .select('persona_group, short_description')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (jobsError) {
        console.error('Error fetching persona generation jobs:', jobsError);
        return;
      }

      // Fetch all jobs including Default
      const { data: allJobs, error: allJobsError } = await supabase
        .from('persona_generation_jobs')
        .select('persona_group, short_description, personas_generated')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .eq('status', 'completed');

      if (allJobsError) {
        console.error('Error fetching all jobs:', allJobsError);
        return;
      }

      // Create options from all completed jobs
      const groupOptions: PersonaGroupOption[] = (allJobs || [])
        .filter(job => job.persona_group !== 'Default')
        .map(job => ({
          value: job.persona_group,
          label: job.persona_group,
          description: job.short_description || 'Custom cohort',
          count: job.personas_generated,
        }));

      const defaultJob = allJobs?.find(job => job.persona_group === 'Default');

      setOptions([
        {
          value: 'Default',
          label: 'General Audience',
          description: 'Broad market testing',
          count: defaultJob && defaultJob.personas_generated > 0 ? defaultJob.personas_generated : 50,
        },
        ...groupOptions,
      ]);
    };

    fetchPersonaGroups();
  }, [user]);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    if (selectedOption && onCountChange && selectedOption.count !== undefined) {
      onCountChange(selectedOption.count);
    }
  }, [selectedOption?.count, onCountChange]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('persona_quota, additional_quota')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setAvailableQuota(profileData.persona_quota + profileData.additional_quota);
    }

    // Fetch all jobs including Default
    const { data: allJobs, error: allJobsError } = await supabase
      .from('persona_generation_jobs')
      .select('persona_group, short_description, personas_generated')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .eq('status', 'completed');

    if (allJobsError) {
      console.error('Error fetching all jobs:', allJobsError);
      return;
    }

    // Create options from all completed jobs
    const groupOptions: PersonaGroupOption[] = (allJobs || [])
      .filter(job => job.persona_group !== 'Default')
      .map(job => ({
        value: job.persona_group,
        label: job.persona_group,
        description: job.short_description || 'Custom cohort',
        count: job.personas_generated,
      }));

    const defaultJob = allJobs?.find(job => job.persona_group === 'Default');

    setOptions([
      {
        value: 'Default',
        label: 'General Audience',
        description: 'Broad market testing',
        count: defaultJob && defaultJob.personas_generated > 0 ? defaultJob.personas_generated : 50,
      },
      ...groupOptions,
    ]);
  };

  return (
    <>
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
                      <button
                        key={option.value}
                        onClick={() => {
                          onChange(option.value);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className={cn(
                          "w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors flex items-start gap-3",
                          value === option.value && "bg-accent/30"
                        )}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                        {value === option.value && (
                          <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        )}
                      </button>
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
                    setShowCreateDialog(true);
                    setIsOpen(false);
                    setSearchQuery("");
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
      </div>

      <CreateCustomCohortDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleRefresh}
        availableQuota={availableQuota}
      />
    </>
  );
};