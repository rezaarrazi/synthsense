import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PersonaGroup {
  id: string;
  name: string;
  description: string;
  personas: Persona[];
}

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

interface PersonaGroupSelectProps {
  onPersonaSelect: (persona: Persona) => void;
  experimentId: string;
}

export const PersonaGroupSelect = ({ onPersonaSelect, experimentId }: PersonaGroupSelectProps) => {
  const { user } = useAuth();
  const [personaGroups, setPersonaGroups] = useState<PersonaGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    const fetchPersonaGroups = async () => {
      try {
        // TODO: Implement persona groups fetching via GraphQL
        // For now, use mock data
        const mockGroups: PersonaGroup[] = [
          {
            id: "tech-professionals",
            name: "Tech Professionals",
            description: "Software engineers, product managers, and tech leaders",
            personas: []
          },
          {
            id: "healthcare-workers",
            name: "Healthcare Workers",
            description: "Doctors, nurses, and healthcare administrators",
            personas: []
          },
          {
            id: "small-business-owners",
            name: "Small Business Owners",
            description: "Entrepreneurs and small business operators",
            personas: []
          }
        ];
        setPersonaGroups(mockGroups);
      } catch (error) {
        console.error('Error fetching persona groups:', error);
        toast.error('Failed to load persona groups');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonaGroups();
  }, [experimentId]);

  const handleGroupSelect = async (groupId: string) => {
    if (selectedGroup === groupId) {
      setSelectedGroup(null);
      return;
    }

    setSelectedGroup(groupId);
    
    try {
      // TODO: Implement personas fetching for selected group via GraphQL
      toast.info('Persona generation will be implemented via GraphQL');
    } catch (error) {
      console.error('Error fetching personas:', error);
      toast.error('Failed to load personas for this group');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading persona groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Persona Group</h2>
        <p className="text-muted-foreground">
          Choose a group of personas to generate for your experiment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personaGroups.map((group) => (
          <Card
            key={group.id}
            className={`cursor-pointer transition-all ${
              selectedGroup === group.id
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:shadow-md'
            }`}
            onClick={() => handleGroupSelect(group.id)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{group.name}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {group.personas.length} personas
                </Badge>
                {selectedGroup === group.id && (
                  <Badge variant="default">Selected</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedGroup && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">
            Personas in {personaGroups.find(g => g.id === selectedGroup)?.name}
          </h3>
          <div className="text-center py-8 text-muted-foreground">
            <p>Persona generation will be implemented via GraphQL</p>
            <p className="text-sm mt-2">
              This will create realistic personas based on the selected group
            </p>
          </div>
        </div>
      )}
    </div>
  );
};