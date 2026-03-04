import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw, Copy, Check } from 'lucide-react';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useStorePerformanceBenchmark } from '@/hooks/inventory/useStorePerformanceBenchmark';
import { useStoreProductMix } from '@/hooks/inventory/useStoreProductMix';
import { useStoreCustomerKpis } from '@/hooks/inventory/useStoreCustomerKpis';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

const ANALYSIS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-ai-analysis`;

interface Props {
  storeId: string;
  storeName: string;
  storeTier: string;
  lookbackDays: number;
}

export function StoreAIAnalysisTab({ storeId, storeName, storeTier, lookbackDays }: Props) {
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { client, tenantId } = useTenantQueryBuilder();

  const { data: benchmark } = useStorePerformanceBenchmark(storeId);
  const { data: productMix } = useStoreProductMix(storeId);
  const { data: customerKpis } = useStoreCustomerKpis(storeId, lookbackDays);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (isLoading && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [analysis, isLoading]);

  const runAnalysis = useCallback(async () => {
    if (!tenantId) {
      toast.error('Chưa chọn tenant');
      return;
    }

    setIsLoading(true);
    setAnalysis('');

    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session?.access_token) throw new Error('Chưa đăng nhập');

      const storeData = {
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
      };

      const response = await fetch(ANALYSIS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ storeData }),
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

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);

          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              content += parsed.delta.text;
              setAnalysis(content);
            }
          } catch {
            // partial JSON, ignore
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              content += parsed.delta.text;
            }
          } catch { /* ignore */ }
        }
        setAnalysis(content);
      }

    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi phân tích AI');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, client, storeName, storeTier, lookbackDays, benchmark, productMix, customerKpis]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    toast.success('Đã copy!');
    setTimeout(() => setCopied(false), 2000);
  }, [analysis]);

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-2 pt-3 px-0">
        <CardTitle className="text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI Phân tích chiến lược
            <span className="text-[10px] font-normal bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Claude</span>
          </span>
          <div className="flex items-center gap-1.5">
            {analysis && (
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
              {isLoading ? (
                <><Loader2 className="h-3 w-3 animate-spin" />Đang phân tích...</>
              ) : analysis ? (
                <><RefreshCw className="h-3 w-3" />Phân tích lại</>
              ) : (
                <><Sparkles className="h-3 w-3" />Bắt đầu phân tích</>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-3 pt-1">
        {!analysis && !isLoading ? (
          <div className="py-8 text-center">
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
            className="overflow-y-auto max-h-[calc(100vh-380px)] min-h-[300px] pr-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="ai-analysis-content text-sm leading-relaxed space-y-3">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-base font-bold text-foreground border-b border-border pb-2 mb-3 mt-4 first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-sm font-bold text-foreground bg-muted/50 px-3 py-2 rounded-lg mb-2 mt-4 first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold text-foreground mt-3 mb-1.5">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-muted-foreground mb-2 leading-relaxed">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-foreground font-semibold">{children}</strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-1 mb-2 ml-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="space-y-1.5 mb-2 ml-1 list-decimal list-inside">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-muted-foreground flex gap-1.5 items-start">
                      <span className="text-primary mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
                      <span className="flex-1">{children}</span>
                    </li>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-3 rounded-lg border border-border">
                      <table className="w-full text-xs">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/70">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-1.5 text-muted-foreground border-b border-border/50">{children}</td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/40 pl-3 py-1 my-2 bg-primary/5 rounded-r-lg text-muted-foreground italic">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="border-border my-3" />,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>
                    ) : (
                      <code className="block bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto">{children}</code>
                    );
                  },
                }}
              >
                {analysis}
              </ReactMarkdown>
              {isLoading && (
                <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-0.5 rounded-sm" />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
