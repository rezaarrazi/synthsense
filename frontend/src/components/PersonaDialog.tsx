import { X, Send, Lock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const PersonaDialog = ({ 
  persona, 
  onClose, 
  experimentId,
  isGuest = false,
  onAuthRequired
}: { 
  persona: Persona; 
  onClose: () => void; 
  experimentId: string;
  isGuest?: boolean;
  onAuthRequired?: () => void;
}) => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchConversation = async () => {
      if (isGuest) {
        setIsFetching(false);
        return;
      }

      try {
        // TODO: Implement conversation fetching via GraphQL
        // For now, just set empty messages
        setMessages([]);
        setConversationId(null);
      } catch (error) {
        console.error('Error fetching conversation:', error);
        toast({
          title: "Error",
          description: "Failed to load conversation history",
          variant: "destructive",
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchConversation();
  }, [persona.id, experimentId, isGuest, toast]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!question.trim()) return;

    if (isGuest) {
      onAuthRequired?.();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setQuestion("");
    setIsLoading(true);

    try {
      // TODO: Implement chat with persona via GraphQL
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "This is a placeholder response. The chat functionality will be implemented via GraphQL.",
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <img
              src={persona.avatar}
              alt={persona.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h2 className="font-semibold text-lg">{persona.name}</h2>
              <p className="text-sm text-muted-foreground">{persona.title}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isFetching ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading conversation...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium mb-2">Start a conversation with {persona.name}</p>
                <p className="text-sm">Ask them about their thoughts, preferences, or experiences.</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          {isGuest ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Sign in to chat with personas
              </span>
              <Button size="sm" onClick={onAuthRequired}>
                Sign In
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                className="flex-1 min-h-[40px] max-h-[120px] p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!question.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};