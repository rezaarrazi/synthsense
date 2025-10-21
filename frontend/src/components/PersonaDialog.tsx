import { X, Send, Lock } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from '@apollo/client';
import { 
  GET_CONVERSATION_MESSAGES_MUTATION,
  CHAT_WITH_PERSONA_MUTATION 
} from "@/graphql/queries";

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
  persona_data: Record<string, unknown>;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  
  // GraphQL mutations
  const [getMessages] = useMutation(GET_CONVERSATION_MESSAGES_MUTATION);
  const [chatWithPersona] = useMutation(CHAT_WITH_PERSONA_MUTATION);

  useEffect(() => {
    // Initialize conversation with persona's initial response
    if (!loading && !isGuest) {
      initializeConversation();
    } else if (isGuest) {
      // Guest mode: just show the initial response
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: persona.response,
        created_at: new Date().toISOString()
      }]);
    }
  }, [persona.id, experimentId, loading, user, isGuest]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeConversation = useCallback(async () => {
    if (!user) {
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }

    // Generate a unique conversation ID for this persona-experiment combination
    const newConversationId = `${experimentId}-${persona.id}`;
    setConversationId(newConversationId);

    try {
      // Try to load existing conversation messages
      const { data } = await getMessages({
        variables: {
          token: localStorage.getItem('access_token') || "",
          conversationId: newConversationId
        }
      });

      if (data?.getConversationMessages && data.getConversationMessages.length > 0) {
        // Load existing messages and prepend the persona's initial response
        const conversationMessages = data.getConversationMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          created_at: msg.createdAt
        }));
        
        // Prepend the persona's initial response if it's not already in the conversation
        const hasInitialResponse = conversationMessages.some(msg => 
          msg.role === 'assistant' && msg.content === persona.response
        );
        
        if (!hasInitialResponse) {
          conversationMessages.unshift({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: persona.response,
            created_at: new Date().toISOString()
          });
        }
        
        setMessages(conversationMessages);
      } else {
        // Initialize with the persona's initial response
        setMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: persona.response,
          created_at: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Fallback to initial response
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: persona.response,
        created_at: new Date().toISOString()
      }]);
    }
  }, [user, experimentId, persona.id, persona.response, onAuthRequired, getMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) return;
    
    if (isGuest) {
      toast({
        title: "Authentication required",
        description: "Please sign in to chat with personas",
        variant: "destructive"
      });
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to continue",
        variant: "destructive"
      });
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }

    if (!conversationId) {
      toast({
        title: "Error",
        description: "Conversation not initialized",
        variant: "destructive"
      });
      return;
    }

    const userMessage = question.trim();
    setQuestion("");
    setIsLoading(true);

    // Add user message to UI immediately
    const userMessageObj: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessageObj]);

    try {
      const { data } = await chatWithPersona({
        variables: {
          token: localStorage.getItem('access_token') || "",
          conversationId: conversationId,
          personaId: persona.id,
          message: userMessage
        }
      });

      if (data?.chatWithPersona) {
        // Add AI response to UI
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.chatWithPersona.message,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
      
      // Remove the user message if chat failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">PE</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{persona.name}</h2>
                <p className="text-sm text-muted-foreground">{persona.title}</p>
                <p className="text-sm text-muted-foreground">📍 {persona.location}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Persona Details */}
        <div className="p-6 border-b border-border">
          <div className="flex flex-wrap gap-2 mb-3">
            {persona.persona_data?.sex && (
              <span className="px-2 py-1 bg-secondary text-xs rounded-md text-foreground">
                {String(persona.persona_data.sex)}
              </span>
            )}
            {persona.persona_data?.age && (
              <span className="px-2 py-1 bg-secondary text-xs rounded-md text-foreground">
                {String(persona.persona_data.age)} years old
              </span>
            )}
            {persona.persona_data?.education && (
              <span className="px-2 py-1 bg-secondary text-xs rounded-md text-foreground">
                {String(persona.persona_data.education)}
              </span>
            )}
            {persona.persona_data?.income_level && (
              <span className="px-2 py-1 bg-secondary text-xs rounded-md text-foreground">
                {String(persona.persona_data.income_level)} income
              </span>
            )}
            {persona.persona_data?.relationship_status && (
              <span className="px-2 py-1 bg-secondary text-xs rounded-md text-foreground">
                {String(persona.persona_data.relationship_status)}
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-border">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Persona a question..."
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading || isGuest}
            />
            <Button type="submit" disabled={isLoading || !question.trim() || isGuest}>
              {isGuest ? <Lock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          {isGuest && (
            <p className="text-xs text-muted-foreground mt-2">
              Sign in to chat with this persona
            </p>
          )}
        </div>
      </div>
    </div>
  );
};