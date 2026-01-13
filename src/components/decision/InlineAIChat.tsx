import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Sparkles, Loader2, RefreshCw, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DecisionCard } from '@/hooks/useDecisionCards';
import { toast } from 'sonner';

// AI Advisor Response Schema
interface AIAdvisorResponse {
  mode: 'silent' | 'proactive' | 'explain' | 'compare_options' | 'dismiss_response';
  title?: string;
  body_lines?: string[];
  recommendation?: {
    action_type: string;
    why_lines?: string[];
  };
  options?: Array<{
    action_type: string;
    consequence_line: string;
  }>;
  cta_label?: string;
  confidence_note?: string;
  safety_note?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  parsedResponse?: AIAdvisorResponse;
}

interface InlineAIChatProps {
  card: DecisionCard;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decision-advisor`;

const QUICK_PROMPTS = [
  "Vì sao khuyến nghị này?",
  "So sánh các lựa chọn",
  "Nếu trì hoãn thì sao?",
];

// Try to parse JSON from AI response
function tryParseAIResponse(content: string): AIAdvisorResponse | null {
  try {
    // Try to extract JSON from the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

// Render structured AI response
function AIResponseRenderer({ response }: { response: AIAdvisorResponse }) {
  if (response.mode === 'silent') {
    return (
      <div className="text-sm text-muted-foreground italic">
        AI đang theo dõi...
      </div>
    );
  }

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'PAUSE': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      'STOP': 'bg-red-500/10 text-red-600 border-red-500/20',
      'SCALE': 'bg-green-500/10 text-green-600 border-green-500/20',
      'INVESTIGATE': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'PROTECT': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'AVOID': 'bg-red-500/10 text-red-600 border-red-500/20',
      'FREEZE_SPEND': 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    return colors[action] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-3">
      {/* Title */}
      {response.title && (
        <div className="font-semibold text-sm flex items-start gap-2">
          {response.mode === 'proactive' && (
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          )}
          <span>{response.title}</span>
        </div>
      )}

      {/* Body lines */}
      {response.body_lines && response.body_lines.length > 0 && (
        <div className="space-y-1.5">
          {response.body_lines.map((line, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Options (compare mode) */}
      {response.options && response.options.length > 0 && (
        <div className="space-y-2 mt-3">
          {response.options.map((option, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border">
              <Badge variant="outline" className={cn("shrink-0", getActionColor(option.action_type))}>
                {option.action_type}
              </Badge>
              <span className="text-sm">{option.consequence_line}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      {response.recommendation && (
        <div className="mt-3 p-3 rounded-lg border bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <Badge className={getActionColor(response.recommendation.action_type)}>
              Khuyến nghị: {response.recommendation.action_type}
            </Badge>
          </div>
          {response.recommendation.why_lines && (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {response.recommendation.why_lines.map((line, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <ArrowRight className="h-3 w-3 mt-1 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Confidence note */}
      {response.confidence_note && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-amber-500/50 pl-2">
          ⚠️ {response.confidence_note}
        </p>
      )}

      {/* Safety note */}
      {response.safety_note && (
        <p className="text-xs text-destructive/80 italic border-l-2 border-destructive/50 pl-2">
          {response.safety_note}
        </p>
      )}
    </div>
  );
}

export function InlineAIChat({ card }: InlineAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoAnalyzed, setHasAutoAnalyzed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-analyze on mount
  useEffect(() => {
    if (!hasAutoAnalyzed && messages.length === 0) {
      setHasAutoAnalyzed(true);
      handleSend(`Phân tích Decision Card này và đưa ra khuyến nghị.`);
    }
  }, [card.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const cardContext = {
        id: card.id,
        title: card.title,
        question: card.question,
        type: card.card_type,
        priority: card.priority,
        impact_amount: card.impact_amount,
        deadline: card.deadline_at,
        entity: card.entity_label,
        facts: card.facts,
        actions: card.actions,
        confidence: card.confidence,
        owner_role: card.owner_role,
      };

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          cardContext,
          userRole: 'CEO',
        }),
      });

      if (!response.ok || !response.body) {
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Vui lòng thử lại sau.');
        } else if (response.status === 402) {
          toast.error('Hết credit AI. Vui lòng nạp thêm.');
        } else {
          toast.error('Không thể kết nối AI');
        }
        setIsLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const parsedResponse = tryParseAIResponse(assistantContent);
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { 
                  role: 'assistant', 
                  content: assistantContent,
                  parsedResponse: parsedResponse || undefined
                };
                return updated;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final parse attempt
      const finalParsed = tryParseAIResponse(assistantContent);
      if (finalParsed) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { 
            role: 'assistant', 
            content: assistantContent,
            parsedResponse: finalParsed
          };
          return updated;
        });
      }
    } catch (error) {
      console.error('AI Chat error:', error);
      toast.error('Lỗi kết nối AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setHasAutoAnalyzed(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-sm">AI Advisor</span>
          <Badge variant="outline" className="text-xs">OpenAI</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 gap-1">
          <RefreshCw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-6">
              <Bot className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                AI đang phân tích...
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="p-1.5 rounded-full bg-primary/10 h-fit shrink-0">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'rounded-lg max-w-[95%]',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground px-3 py-2 text-sm'
                    : 'bg-muted px-3 py-3'
                )}
              >
                {msg.role === 'assistant' ? (
                  msg.parsedResponse ? (
                    <AIResponseRenderer response={msg.parsedResponse} />
                  ) : (
                    // While streaming or if no valid JSON, show loading indicator instead of raw JSON
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Đang phân tích quyết định...</span>
                    </div>
                  )
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Quick prompts */}
      {messages.length > 0 && !isLoading && (
        <div className="flex flex-wrap gap-1.5 py-2 border-t">
          {QUICK_PROMPTS.map((prompt, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => handleSend(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 pt-2 border-t"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi thêm về quyết định..."
          className="text-sm"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
