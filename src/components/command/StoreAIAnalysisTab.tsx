import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, RefreshCw, Copy, Check, Send } from 'lucide-react';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useStorePerformanceBenchmark } from '@/hooks/inventory/useStorePerformanceBenchmark';
import { useStoreProductMix } from '@/hooks/inventory/useStoreProductMix';
import { useStoreCustomerKpis } from '@/hooks/inventory/useStoreCustomerKpis';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

const ANALYSIS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-ai-analysis`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  storeId: string;
  storeName: string;
  storeTier: string;
  lookbackDays: number;
}

/* ── Markdown renderer components ── */
const mdComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-base font-bold text-foreground border-b border-border pb-2 mb-3 mt-4 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-sm font-bold text-foreground bg-muted/50 px-3 py-2 rounded-lg mb-2 mt-4 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-sm font-semibold text-foreground mt-3 mb-1.5">{children}</h3>
  ),
  p: ({ children }: any) => (
    <p className="text-muted-foreground mb-2 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: any) => (
    <strong className="text-foreground font-semibold">{children}</strong>
  ),
  ul: ({ children }: any) => (
    <ul className="space-y-1 mb-2 ml-1">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="space-y-1.5 mb-2 ml-1 list-decimal list-inside">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="text-muted-foreground flex gap-1.5 items-start">
      <span className="text-primary mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
      <span className="flex-1">{children}</span>
    </li>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-3 rounded-lg border border-border">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-muted/70">{children}</thead>,
  th: ({ children }: any) => (
    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-3 py-1.5 text-muted-foreground border-b border-border/50">{children}</td>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 py-1 my-2 bg-primary/5 rounded-r-lg text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border my-3" />,
  code: ({ children, className }: any) => {
    const isInline = !className;
    return isInline ? (
      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>
    ) : (
      <code className="block bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto">{children}</code>
    );
  },
};

export function StoreAIAnalysisTab({ storeId, storeName, storeTier, lookbackDays }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { client, tenantId } = useTenantQueryBuilder();

  const { data: benchmark } = useStorePerformanceBenchmark(storeId);
  const { data: productMix } = useStoreProductMix(storeId);
  const { data: customerKpis } = useStoreCustomerKpis(storeId, lookbackDays);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const buildStoreData = useCallback(() => ({
    storeName,
    tier: storeTier,
    period: benchmark?.period ? `${benchmark.period.from} → ${benchmark.period.to}` : `${lookbackDays} ngày gần nhất`,
    benchmark: benchmark ? {
      store: benchmark.store,
      chain_avg: benchmark.chain_avg,
      same_tier_avg: benchmark.same_tier_avg,
    } : null,
    priceSegments: productMix?.price_segments || [],
    categories: productMix?.categories || [],
    topProducts: productMix?.top_products || [],
    bottomProducts: productMix?.bottom_products || [],
    monthlyGap: benchmark?.monthly_gap || [],
    customerKpis: customerKpis ? {
      customerCount: customerKpis.customerCount,
      itemsPerTransaction: customerKpis.itemsPerTransaction,
      returnRate: customerKpis.returnRate,
    } : null,
  }), [storeName, storeTier, lookbackDays, benchmark, productMix, customerKpis]);

  const streamResponse = useCallback(async (body: Record<string, unknown>, onContent: (text: string) => void) => {
    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) throw new Error('Chưa đăng nhập');

    const response = await fetch(ANALYSIS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'x-tenant-id': tenantId!,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Lỗi ${response.status}`);
    }
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            content += parsed.delta.text;
            onContent(content);
          }
        } catch { /* partial */ }
      }
    }

    // Final flush
    if (buffer.trim()) {
      for (const raw of buffer.split('\n')) {
        if (!raw?.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            content += parsed.delta.text;
          }
        } catch { /* ignore */ }
      }
      onContent(content);
    }

    return content;
  }, [client, tenantId]);

  const runAnalysis = useCallback(async () => {
    if (!tenantId) { toast.error('Chưa chọn tenant'); return; }
    setIsLoading(true);
    setMessages([]);

    try {
      const storeData = buildStoreData();
      let assistantContent = '';

      const finalContent = await streamResponse({ storeData }, (text) => {
        assistantContent = text;
        setMessages([{ role: 'assistant', content: text }]);
      });

      setMessages([{ role: 'assistant', content: finalContent || assistantContent }]);
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi phân tích AI');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, buildStoreData, streamResponse]);

  const sendFollowUp = useCallback(async () => {
    const text = followUp.trim();
    if (!text || !tenantId || isLoading) return;

    setFollowUp('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Build full conversation for Claude (include initial store data context)
      const storeData = buildStoreData();
      const storeContext = `Dữ liệu store ${storeName} (${storeTier}): benchmark=${JSON.stringify(storeData.benchmark)}, categories=${JSON.stringify(storeData.categories?.slice(0, 5))}, topProducts=${JSON.stringify(storeData.topProducts?.slice(0, 3))}`;

      const apiMessages = [
        { role: 'user', content: storeContext },
        ...updatedMessages.map(m => ({ role: m.role, content: m.content })),
      ];

      let assistantContent = '';
      const finalContent = await streamResponse({ messages: apiMessages, storeData }, (text) => {
        assistantContent = text;
        setMessages([...updatedMessages, { role: 'assistant', content: text }]);
      });

      setMessages([...updatedMessages, { role: 'assistant', content: finalContent || assistantContent }]);
    } catch (error) {
      console.error('Follow-up error:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi gửi câu hỏi');
    } finally {
      setIsLoading(false);
    }
  }, [followUp, tenantId, isLoading, messages, buildStoreData, storeName, storeTier, streamResponse]);

  const handleCopy = useCallback(() => {
    const allContent = messages.filter(m => m.role === 'assistant').map(m => m.content).join('\n\n---\n\n');
    navigator.clipboard.writeText(allContent);
    setCopied(true);
    toast.success('Đã copy!');
    setTimeout(() => setCopied(false), 2000);
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFollowUp();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <Card className="border-0 shadow-none bg-transparent flex flex-col h-full">
      <CardHeader className="pb-2 pt-3 px-0 shrink-0">
        <CardTitle className="text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI Phân tích chiến lược
            <span className="text-[10px] font-normal bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Claude</span>
          </span>
          <div className="flex items-center gap-1.5">
            {hasMessages && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={runAnalysis}
              disabled={isLoading}
            >
              {isLoading && !hasMessages ? (
                <><Loader2 className="h-3 w-3 animate-spin" />Đang phân tích...</>
              ) : hasMessages ? (
                <><RefreshCw className="h-3 w-3" />Phân tích lại</>
              ) : (
                <><Sparkles className="h-3 w-3" />Bắt đầu phân tích</>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-0 pb-0 pt-1 flex-1 flex flex-col min-h-0">
        {/* Messages area */}
        {!hasMessages && !isLoading ? (
          <div className="py-8 text-center flex-1 flex flex-col items-center justify-center">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nhấn "Bắt đầu phân tích" để AI đánh giá hiệu suất store
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Sử dụng Claude AI • Dữ liệu: Benchmark, Product Mix, Customer Metrics
            </p>
          </div>
        ) : (
          <div
            ref={contentRef}
            className="overflow-y-auto flex-1 min-h-0 pr-2 space-y-4"
            style={{ scrollbarWidth: 'thin' }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                {msg.role === 'user' ? (
                  <div className="bg-primary/10 text-foreground rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="ai-analysis-content text-sm leading-relaxed space-y-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {msg.content}
                    </ReactMarkdown>
                    {isLoading && i === messages.length - 1 && (
                      <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-0.5 rounded-sm" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Follow-up input */}
        {hasMessages && (
          <div className="shrink-0 pt-3 pb-2 border-t border-border mt-2">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi thêm về store này... (Enter để gửi)"
                className="min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl bg-muted/50 border-border/50"
                rows={1}
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
                onClick={sendFollowUp}
                disabled={isLoading || !followUp.trim()}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
