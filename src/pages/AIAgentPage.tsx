import { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Bot, User, Sparkles, RefreshCw, Clock, ArrowUp, TrendingUp, ShieldAlert, Package, BarChart3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import AIMessageContent from '@/components/ai/AIMessageContent';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  responseTimeMs?: number;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cdp-qa`;

const SUGGESTION_PILLS = [
  { icon: TrendingUp, label: 'Doanh thu tháng này so với tháng trước?', color: 'text-emerald-400' },
  { icon: BarChart3, label: 'Kênh nào đang lãi tốt nhất?', color: 'text-blue-400' },
  { icon: Package, label: 'Top sản phẩm bán chạy nhất?', color: 'text-amber-400' },
  { icon: ShieldAlert, label: 'Có vấn đề gì cần xử lý gấp?', color: 'text-red-400' },
  { icon: TrendingUp, label: 'Tóm tắt hiệu suất tháng này', color: 'text-purple-400' },
  { icon: BarChart3, label: 'Hiệu quả quảng cáo đang thế nào?', color: 'text-cyan-400' },
];

export default function AIAgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { client, tenantId } = useTenantQueryBuilder();
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const sendMessage = useCallback(async (question: string) => {
    if (!tenantId) { toast.error('Vui lòng chọn tenant'); return; }

    const userMessage: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const startTime = performance.now();

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
      let isDone = false;

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (!isDone) {
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
          if (jsonStr === '[DONE]') { isDone = true; break; }
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
      const elapsed = Math.round(performance.now() - startTime);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        if (last?.role === 'assistant') {
          const n = [...prev];
          n[n.length - 1] = { ...last, responseTimeMs: elapsed };
          return n;
        }
        return prev;
      });
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

  const clearMessages = () => { setMessages([]); };

  const hasMessages = messages.length > 0;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-4 md:-m-6">
      <Helmet>
        <title>AI Analyst | Bluecore</title>
        <meta name="description" content="Bluecore AI Analyst — hỏi bất kỳ câu hỏi về doanh thu, KPIs, cảnh báo, khách hàng" />
      </Helmet>
      {/* Header with back button */}
      <div className="px-4 pt-3 pb-1">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-xs text-muted-foreground hover:text-foreground gap-1.5 -ml-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay về FDP
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {!hasMessages ? (
            /* ─── Empty State ─── */
            <div className="h-full flex flex-col items-center justify-center text-center px-4 min-h-[500px]">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="relative mb-6"
              >
                {/* Glow ring */}
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary/20 blur-xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="h-9 w-9 text-primary" />
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Bluecore AI Analyst
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mb-8">
                  Hỏi bất kỳ câu hỏi nào — AI tự truy vấn dữ liệu SSOT và phân tích cho bạn.
                </p>
              </motion.div>

              {/* Suggestion Pills */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl w-full"
              >
                {SUGGESTION_PILLS.map((pill, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.06, duration: 0.3 }}
                    onClick={() => sendMessage(pill.label)}
                    disabled={isLoading}
                    className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-border/60 bg-card/50 hover:bg-accent/60 hover:border-primary/30 transition-all duration-200 text-left hover:shadow-lg hover:shadow-primary/5"
                  >
                    <pill.icon className={cn('h-4 w-4 flex-shrink-0 transition-colors', pill.color, 'group-hover:text-primary')} />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">
                      {pill.label}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          ) : (
            /* ─── Messages ─── */
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className={cn('flex gap-3 py-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card border border-border/50 rounded-bl-md'
                    )}>
                      {msg.role === 'assistant' ? (
                        <>
                          <AIMessageContent content={msg.content} />
                          {msg.responseTimeMs && (
                            <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-border/30">
                              <Clock className="h-3 w-3 text-muted-foreground/50" />
                              <span className="text-[10px] text-muted-foreground/50">
                                {msg.responseTimeMs < 1000
                                  ? `${msg.responseTimeMs}ms`
                                  : `${(msg.responseTimeMs / 1000).toFixed(1)}s`}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-secondary border border-border/50 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 py-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5 items-center h-5">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ─── Input Area (ChatGPT-style) ─── */}
      <div className="px-4 pb-4 pt-2">
        <div className="max-w-3xl mx-auto">
          {/* Reset button */}
          {hasMessages && (
            <div className="flex justify-center mb-2">
              <Button variant="ghost" size="sm" onClick={clearMessages} className="text-xs text-muted-foreground hover:text-foreground gap-1.5">
                <RefreshCw className="h-3 w-3" /> Cuộc trò chuyện mới
              </Button>
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi về doanh thu, đơn hàng, KPIs, alerts, khách hàng..."
              disabled={isLoading}
              rows={1}
              className="resize-none min-h-[48px] max-h-[150px] pr-12 rounded-2xl border-border/60 bg-card/80 backdrop-blur-sm focus-visible:ring-primary/30 focus-visible:border-primary/40 transition-all text-sm py-3 pl-4"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className={cn(
                'absolute right-2 bottom-2 h-8 w-8 rounded-xl transition-all duration-200',
                input.trim()
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
            AI Analyst truy vấn dữ liệu SSOT real-time. Kết quả mang tính tham khảo.
          </p>
        </div>
      </div>
    </div>
  );
}
