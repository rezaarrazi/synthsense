import { X, Send, Lock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    loadOrCreateConversation();
  }, [persona.id, experimentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOrCreateConversation = async () => {
    setIsFetching(true);
    
    if (isGuest) {
      // Guest mode: just show the initial response, no database calls
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: persona.response,
        created_at: new Date().toISOString()
      }]);
      setIsFetching(false);
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to continue",
          variant: "destructive"
        });
        return;
      }

      // Try to find existing conversation
      const { data: existingConv } = await supabase
        .from('persona_conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('persona_id', persona.id)
        .eq('experiment_id', experimentId)
        .maybeSingle();

      if (existingConv) {
        // Load existing conversation
        setConversationId(existingConv.id);
        await loadMessages(existingConv.id);
      } else {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('persona_conversations')
          .insert({
            user_id: user.id,
            persona_id: persona.id,
            experiment_id: experimentId
          })
          .select()
          .single();

        if (createError) throw createError;

        setConversationId(newConv.id);
        
        // Seed with persona's initial response
        const { error: seedError } = await supabase
          .from('persona_messages')
          .insert({
            conversation_id: newConv.id,
            role: 'assistant',
            content: persona.response
          });

        if (seedError) throw seedError;

        setMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: persona.response,
          created_at: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast({
        title: "Failed to load conversation",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('persona_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
    } else if (data) {
      setMessages(data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        created_at: msg.created_at
      })));
    }
  };

  const handleSendMessage = async () => {
    if (!question.trim() || !conversationId || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question.trim(),
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase.functions.invoke('chat-with-persona', {
        body: {
          conversation_id: conversationId,
          message: userMessage.content,
          persona_id: persona.id,
          user_id: user.id
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove the user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-lg">
                {persona.avatar}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{persona.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {persona.persona_data?.occupation || persona.title}
                  {persona.income && persona.income !== 'N/A' ? ` • ${persona.income}` : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">📍 {persona.persona_data?.city_country || persona.location}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {persona.persona_data?.sex && (
              <span className="px-2 py-1 bg-secondary text-xs rounded-md text-foreground">
                {persona.persona_data.sex}
              </span>
            )}
            {persona.persona_data?.age && (
              <span className="px-2 py-1 bg-secondary text-xs rounded-md text-foreground">
                {persona.persona_data.age} years old
              </span>
            )}
            {persona.persona_data?.education && (
              <span className="px-2 py-1 bg-secondary text-xs rounded-md text-foreground">
                {persona.persona_data.education}
              </span>
            )}
            {persona.persona_data?.income_level && (
              <span className="px-2 py-1 bg-secondary text-xs rounded-md text-foreground">
                {persona.persona_data.income_level} income
              </span>
            )}
            {persona.persona_data?.relationship_status && (
              <span className="px-2 py-1 bg-secondary text-xs rounded-md text-foreground">
                {persona.persona_data.relationship_status}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isFetching ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-muted-foreground">Loading conversation...</div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/50 text-foreground'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <div className={`text-xs mt-2 ${msg.role === 'user' ? 'opacity-80' : 'text-muted-foreground'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {!isGuest ? (
          <div className="p-4 border-t border-border">
            <div className="relative">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading || isFetching}
                placeholder={`Ask ${persona.name.split(" ")[0]} a question...`}
                className="w-full bg-secondary border border-border rounded-lg pl-4 pr-12 py-3 text-sm disabled:opacity-50"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={isLoading || !question.trim() || isFetching}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-primary hover:bg-primary/90 h-8 w-8 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-border bg-primary/10">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>Sign up to continue this conversation</span>
              </div>
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => onAuthRequired?.()}
              >
                Create Free Account
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
