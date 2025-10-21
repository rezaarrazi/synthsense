import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share, BarChart3, Users, MessageSquare, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Experiment {
  id: string;
  title: string;
  description: string;
  created_at: string;
  status: string;
}

interface Response {
  id: string;
  persona_id: string;
  question: string;
  answer: string;
  created_at: string;
}

interface Persona {
  id: string;
  name: string;
  title: string;
  avatar: string;
  sentiment: "adopt" | "mixed" | "not";
}

interface ResultsDashboardProps {
  experimentId: string;
}

export const ResultsDashboard = ({ experimentId }: ResultsDashboardProps) => {
  const { user } = useAuth();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Implement data fetching via GraphQL
        // For now, use mock data
        const mockExperiment: Experiment = {
          id: experimentId,
          title: "Sample Experiment",
          description: "This is a sample experiment",
          created_at: new Date().toISOString(),
          status: "completed"
        };

        const mockResponses: Response[] = [];
        const mockPersonas: Persona[] = [];

        setExperiment(mockExperiment);
        setResponses(mockResponses);
        setPersonas(mockPersonas);
      } catch (error) {
        console.error('Error fetching experiment data:', error);
        toast.error('Failed to load experiment data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [experimentId]);

  const handleExport = () => {
    // TODO: Implement export functionality
    toast.info('Export functionality will be implemented');
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    toast.info('Share functionality will be implemented');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading results...</div>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Experiment not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{experiment.title}</h1>
          <p className="text-muted-foreground mt-1">{experiment.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responses.length}</div>
            <p className="text-xs text-muted-foreground">
              Responses collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personas.length}</div>
            <p className="text-xs text-muted-foreground">
              Active personas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">
              Response completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="default" className="text-sm">
              {experiment.status}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Experiment status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Results Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
            <CardDescription>
              Distribution of persona sentiments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Adopt</span>
                <Badge variant="default">45%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Mixed</span>
                <Badge variant="secondary">35%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Not Adopt</span>
                <Badge variant="destructive">20%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Response Summary</CardTitle>
            <CardDescription>
              Key insights from responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Response analysis will be implemented via GraphQL</p>
              <p className="text-sm mt-2">
                This will show detailed insights and patterns
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Responses</CardTitle>
          <CardDescription>
            Individual responses from personas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No responses yet</p>
              <p className="text-sm mt-2">
                Responses will appear here once personas start responding
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => (
                <div key={response.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{response.question}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {response.answer}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {response.created_at ? new Date(response.created_at).toLocaleDateString() : 'N/A'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};