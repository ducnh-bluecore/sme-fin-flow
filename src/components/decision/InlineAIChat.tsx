import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DecisionCard } from '@/hooks/useDecisionCards';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface InlineAIChatProps {
  card: DecisionCard;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decision-advisor`;

const QUICK_PROMPTS = [
  "Phân tích rủi ro",
  "So sánh các lựa chọn",
  "Kịch bản tệ nhất?",
];

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
      handleSend(`Phân tích nhanh Decision Card: "${card.title}". Cho tôi biết nên quyết định thế nào?`);
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
        title: card.title,
        question: card.question,
        type: card.card_type,
        priority: card.priority,
        impact_amount: card.impact_amount,
        deadline: card.deadline_at,
        entity: card.entity_label,
        facts: card.facts,
        actions: card.actions,
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
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
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
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 gap-1">
          <RefreshCw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4" ref={scrollRef}>
        <div className="space-y-3">
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
                  'rounded-lg px-3 py-2 max-w-[90%] text-sm whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {msg.content || (isLoading && i === messages.length - 1 && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ))}
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
