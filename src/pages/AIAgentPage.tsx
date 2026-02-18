import { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Bot, User, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import AIMessageContent from '@/components/ai/AIMessageContent';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cdp-qa`;

const SCENARIO_GROUPS = [
  {
    label: '💰 Doanh Thu & Lợi Nhuận',
    color: 'bg-emerald-500/10 text-emerald-400',
    questions: [
      'Doanh thu tháng này so với tháng trước thế nào?',
      'Kênh nào đang lỗ hay lãi ít nhất?',
      'Margin tổng thể đang ở mức bao nhiêu?',
    ],
  },
  {
    label: '📦 Sản Phẩm & Tồn Kho',
    color: 'bg-blue-500/10 text-blue-400',
    questions: [
      'Top 10 sản phẩm bán chạy nhất tháng này?',
      'Sản phẩm nào đang tồn kho nhiều nhất?',
      'Kênh nào có gross margin cao nhất?',
    ],
  },
  {
    label: '⚠️ Rủi Ro & Cảnh Báo',
    color: 'bg-red-500/10 text-red-400',
    questions: [
      'Hiện tại có vấn đề gì nghiêm trọng cần xử lý?',
      'Có bao nhiêu cảnh báo đang mở?',
    ],
  },
  {
    label: '👥 Khách Hàng',
    color: 'bg-purple-500/10 text-purple-400',
    questions: [
      'Top khách hàng theo giá trị LTV?',
      'Cohort nào có giá trị tốt nhất?',
      'Bao nhiêu khách hàng có risk level cao?',
    ],
  },
];

export default function AIAgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [showScenarios, setShowScenarios] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { client, tenantId } = useTenantQueryBuilder();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const sendMessage = useCallback(async (question: string) => {
    if (!tenantId) { toast.error('Vui lòng chọn tenant'); return; }

    const userMessage: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setShowScenarios(false);

    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session?.access_token) throw new Error('Chưa đăng nhập');

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error('Rate limit - thử lại sau');
        if (response.status === 402) throw new Error('Hết credits AI');
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Có lỗi xảy ra');
      }

      if (!response.body) throw new Error('Không nhận được phản hồi');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const n = [...prev];
                const last = n.length - 1;
                if (last >= 0 && n[last].role === 'assistant') {
                  n[last] = { role: 'assistant', content: assistantContent };
                }
                return n;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) assistantContent += content;
          } catch { /* ignore */ }
        }
        setMessages(prev => {
          const n = [...prev];
          const last = n.length - 1;
          if (last >= 0 && n[last].role === 'assistant') {
            n[last] = { role: 'assistant', content: assistantContent };
          }
          return n;
        });
      }
    } catch (error) {
      console.error('AI Agent error:', error);
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [messages, tenantId, client]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const q = input.trim();
    setInput('');
    await sendMessage(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const clearMessages = () => { setMessages([]); setShowScenarios(true); };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-4 md:-m-6">
      <Helmet>
        <title>AI Analyst | Bluecore</title>
        <meta name="description" content="Bluecore AI Analyst — hỏi bất kỳ câu hỏi về doanh thu, KPIs, cảnh báo, khách hàng" />
      </Helmet>

      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Bluecore AI Analyst</h1>
            <p className="text-xs text-muted-foreground">
              Hỏi bất kỳ câu hỏi về doanh thu, KPIs, alerts, khách hàng — AI tự truy vấn SSOT và phân tích.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearMessages}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reset
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowScenarios(s => !s)}
          >
            {showScenarios ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="ml-1 text-xs">Gợi ý</span>
          </Button>
        </div>
      </div>

      {/* Scenarios Panel */}
      {showScenarios && (
        <div className="border-b border-border px-6 py-3 bg-muted/20">
          <div className="flex flex-wrap gap-6">
            {SCENARIO_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <span className={cn('inline-block text-xs font-medium px-2 py-0.5 rounded-full', group.color)}>
                  {group.label}
                </span>
                <div className="flex flex-col gap-0.5">
                  {group.questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="text-xs text-left px-2 py-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground">Bluecore AI Analyst</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Hỏi bất kỳ câu hỏi nào về doanh thu, đơn hàng, KPIs, cảnh báo, hay giá trị khách hàng.
                AI sẽ tự sinh SQL, truy vấn SSOT và trả lời.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2',
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {msg.role === 'assistant' ? (
                      <AIMessageContent content={msg.content} />
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-3 bg-card/50">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi về doanh thu, đơn hàng, KPIs, alerts, khách hàng..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
