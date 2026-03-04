import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, RefreshCw, Copy, Check } from 'lucide-react';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useStorePerformanceBenchmark, type StoreBenchmark } from '@/hooks/inventory/useStorePerformanceBenchmark';
import { useStoreProductMix } from '@/hooks/inventory/useStoreProductMix';
import { useStoreCustomerKpis } from '@/hooks/inventory/useStoreCustomerKpis';
import ReactMarkdown from 'react-markdown';
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
  const { client, tenantId } = useTenantQueryBuilder();

  const { data: benchmark } = useStorePerformanceBenchmark(storeId);
  const { data: productMix } = useStoreProductMix(storeId);
  const { data: customerKpis } = useStoreCustomerKpis(storeId, lookbackDays);

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

      // Parse Claude SSE (different format from OpenAI)
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
            // Claude streaming format
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
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            AI Phân tích chiến lược
            <span className="text-[10px] font-normal bg-violet-500/10 text-violet-500 px-1.5 py-0.5 rounded-full">Claude</span>
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
      <CardContent className="px-4 pb-3 pt-1">
        {!analysis && !isLoading ? (
          <div className="py-8 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-violet-400/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nhấn "Bắt đầu phân tích" để AI đánh giá hiệu suất store
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Sử dụng Claude AI • Dữ liệu: Benchmark, Product Mix, Customer Metrics
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{analysis || '...'}</ReactMarkdown>
              {isLoading && (
                <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse ml-0.5" />
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
