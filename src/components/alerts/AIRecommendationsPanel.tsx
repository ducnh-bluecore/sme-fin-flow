/**
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Loader2, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface AIRecommendationsPanelProps {
  alertType?: string;
}

export function AIRecommendationsPanel({ alertType = 'dos_critical' }: AIRecommendationsPanelProps) {
  const { buildSelectQuery, client, tenantId, isReady } = useTenantQueryBuilder();
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  // Fetch products data for analysis
  const { data: products } = useQuery({
    queryKey: ['products-for-ai', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('object_calculated_metrics', '*')
        .order('days_of_stock', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }
      return (data || []) as unknown as any[];
    },
    enabled: isReady && !!tenantId,
  });

  const generateRecommendations = async () => {
    if (!tenantId || !products || products.length === 0) {
      toast.error('Không có dữ liệu sản phẩm để phân tích');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await client.functions.invoke('inventory-recommendations', {
        body: {
          tenantId,
          alertType,
          topProducts: products.slice(0, 20), // Top 20 products for analysis
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('429') || data.error.includes('giới hạn')) {
          toast.error('Đã vượt quá giới hạn yêu cầu, vui lòng thử lại sau.');
        } else if (data.error.includes('402') || data.error.includes('credits')) {
          toast.error('Cần nạp thêm credits để sử dụng AI.');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setRecommendations(data.recommendations);
      setLastGenerated(data.generatedAt);
      toast.success('Đã tạo đề xuất AI thành công!');
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Không thể tạo đề xuất. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getRecommendationIcon = (text: string) => {
    if (text.includes('NÊN NHẬP GẤP') || text.includes('CẦN NHẬP GẤP')) {
      return <AlertTriangle className="h-4 w-4 text-red-400" />;
    }
    if (text.includes('NÊN NHẬP') || text.includes('TĂNG LƯỢNG')) {
      return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    }
    if (text.includes('CÂN NHẮC')) {
      return <Package className="h-4 w-4 text-amber-400" />;
    }
    if (text.includes('KHÔNG NÊN') || text.includes('GIẢM')) {
      return <TrendingDown className="h-4 w-4 text-red-400" />;
    }
    return <CheckCircle className="h-4 w-4 text-blue-400" />;
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900/80 to-purple-900/20 border-purple-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-100">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>
            <span>Đề xuất AI</span>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
              Beta
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={generateRecommendations}
            disabled={isGenerating || !products?.length}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Tạo đề xuất
              </>
            )}
          </Button>
        </CardTitle>
        {lastGenerated && (
          <p className="text-xs text-slate-500">
            Cập nhật lúc: {new Date(lastGenerated).toLocaleString('vi-VN')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!recommendations && !isGenerating && (
          <div className="text-center py-8">
            <div className="p-4 rounded-full bg-purple-500/10 w-fit mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-slate-200 font-medium mb-2">
              Đề xuất thông minh cho tồn kho
            </h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
              AI sẽ phân tích dữ liệu tồn kho, velocity bán hàng và xu hướng để đưa ra đề xuất 
              nên nhập thêm sản phẩm nào hoặc không nên nhập sản phẩm nào.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                <TrendingUp className="h-3 w-3 mr-1" />
                Nên nhập
              </Badge>
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                <Package className="h-3 w-3 mr-1" />
                Cân nhắc
              </Badge>
              <Badge className="bg-red-500/10 text-red-400 border-red-500/30">
                <TrendingDown className="h-3 w-3 mr-1" />
                Không nên nhập
              </Badge>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-slate-300">Đang phân tích dữ liệu tồn kho...</p>
            <p className="text-slate-500 text-sm mt-1">Vui lòng đợi trong giây lát</p>
          </div>
        )}

        {recommendations && !isGenerating && (
          <ScrollArea className="h-[400px] pr-4">
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="text-slate-300 mb-3 leading-relaxed">{children}</p>
                  ),
                  strong: ({ children }) => {
                    const text = String(children);
                    let badgeClass = 'bg-slate-700 text-slate-300';
                    let icon = null;
                    
                    if (text.includes('NÊN NHẬP GẤP') || text.includes('CẦN NHẬP GẤP')) {
                      badgeClass = 'bg-red-500/20 text-red-400 border border-red-500/30';
                      icon = <AlertTriangle className="h-3 w-3 mr-1" />;
                    } else if (text.includes('NÊN NHẬP') || text.includes('TĂNG')) {
                      badgeClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                      icon = <TrendingUp className="h-3 w-3 mr-1" />;
                    } else if (text.includes('CÂN NHẮC')) {
                      badgeClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
                      icon = <Package className="h-3 w-3 mr-1" />;
                    } else if (text.includes('KHÔNG NÊN') || text.includes('GIẢM')) {
                      badgeClass = 'bg-red-500/20 text-red-400 border border-red-500/30';
                      icon = <XCircle className="h-3 w-3 mr-1" />;
                    }
                    
                    return (
                      <Badge className={`${badgeClass} inline-flex items-center text-xs font-medium`}>
                        {icon}
                        {children}
                      </Badge>
                    );
                  },
                  ul: ({ children }) => (
                    <ul className="space-y-2 my-3">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="flex items-start gap-2 text-slate-300">
                      <ArrowRight className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span>{children}</span>
                    </li>
                  ),
                  ol: ({ children }) => (
                    <ol className="space-y-3 my-3">{children}</ol>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold text-slate-100 mb-3">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-semibold text-slate-200 mb-2 mt-4">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-medium text-slate-300 mb-2 mt-3">{children}</h3>
                  ),
                }}
              >
                {recommendations}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
