import { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Bot, User, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cdp-qa`;

const SCENARIO_GROUPS = [
  {
    label: 'L3 KPI',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    questions: [
      'Tổng doanh thu 30 ngày gần nhất theo từng kênh?',
      'ROAS trung bình 7 ngày gần nhất?',
      'So sánh NET_REVENUE tháng này vs tháng trước?',
    ],
  },
  {
    label: 'L2 Orders',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    questions: [
      'Top 10 sản phẩm bán chạy nhất?',
      'Kênh nào có gross margin cao nhất?',
      'Tổng số đơn hàng theo tháng năm 2025?',
    ],
  },
  {
    label: 'L4 Alerts',
    color: 'bg-red-500/10 text-red-700 dark:text-red-400',
    questions: [
      'Có bao nhiêu alert critical đang open?',
      'Liệt kê tất cả alert đang active?',
    ],
  },
  {
    label: 'CDP Equity',
    color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    questions: [
      'Top 20 khách hàng có equity cao nhất?',
      'Bao nhiêu khách hàng có risk level = high?',
      'Cohort nào có LTV cao nhất?',
    ],
  },
];

export default function AIAgentTestPage() {
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
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>AI Agent Test | Bluecore</title>
        <meta name="description" content="Test Bluecore AI Agent across all data layers" />
      </Helmet>

      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              Bluecore AI Agent
              <Badge variant="outline" className="text-xs">Test</Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Full SSOT: L2 Orders · L3 KPI · L4 Alerts · CDP Equity
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
            Scenarios
          </Button>
        </div>
      </div>

      {/* Scenarios Panel */}
      {showScenarios && (
        <div className="border-b px-6 py-3 bg-muted/30">
          <div className="flex flex-wrap gap-4">
            {SCENARIO_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <Badge variant="secondary" className={cn('text-xs', group.color)}>
                  {group.label}
                </Badge>
                <div className="flex flex-col gap-1">
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
        <ScrollArea className="h-[calc(100vh-10rem)] p-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Bluecore AI Agent</h3>
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
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                      </div>
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
      <div className="border-t px-6 py-3 bg-card">
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
