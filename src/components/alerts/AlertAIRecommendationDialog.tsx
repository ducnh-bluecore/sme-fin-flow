import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Package,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { AlertInstance } from '@/hooks/useNotificationCenter';

interface AlertAIRecommendationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: AlertInstance | null;
}

export function AlertAIRecommendationDialog({
  open,
  onOpenChange,
  alert,
}: AlertAIRecommendationDialogProps) {
  const { data: tenantId } = useActiveTenantId();
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);

  // Check if this is a summary alert
  const isSummaryAlert = alert?.alert_type?.includes('summary') || 
    (alert?.metadata as any)?.is_summary === true ||
    alert?.object_type === 'summary';

  const statusFilter = alert?.severity === 'critical' ? 'critical' : 'warning';
  const metricField = alert?.alert_type?.includes('revenue') ? 'revenue_status' : 'dos_status';

  // Fetch related products for this alert
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['alert-products', tenantId, statusFilter, metricField],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('object_calculated_metrics')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq(metricField, statusFilter)
        .order('days_of_stock', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }
      return data || [];
    },
    enabled: open && !!tenantId && isSummaryAlert,
  });

  // For single product alert, fetch that specific product
  const { data: singleProduct } = useQuery({
    queryKey: ['single-product', tenantId, alert?.external_object_id],
    queryFn: async () => {
      if (!tenantId || !alert?.external_object_id) return null;
      const { data, error } = await supabase
        .from('object_calculated_metrics')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('external_id', alert.external_object_id)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        return null;
      }
      return data;
    },
    enabled: open && !!tenantId && !isSummaryAlert && !!alert?.external_object_id,
  });

  const generateRecommendations = async () => {
    if (!tenantId || !alert) {
      toast.error('Không có dữ liệu để phân tích');
      return;
    }

    const productsToAnalyze = isSummaryAlert ? products : (singleProduct ? [singleProduct] : []);
    
    if (!productsToAnalyze || productsToAnalyze.length === 0) {
      toast.error('Không tìm thấy dữ liệu sản phẩm');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('inventory-recommendations', {
        body: {
          tenantId,
          alertType: alert.alert_type,
          alertTitle: alert.title,
          alertMessage: alert.message,
          alertSeverity: alert.severity,
          topProducts: productsToAnalyze,
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
      toast.success('Đã tạo đề xuất thành công!');
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Không thể tạo đề xuất. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRecommendations(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] bg-slate-900 border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>
            Đề xuất AI cho cảnh báo
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
              Beta
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Alert context */}
        {alert && (
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`h-4 w-4 ${
                alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
              }`} />
              <Badge className={`text-xs ${
                alert.severity === 'critical' 
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {alert.severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
              </Badge>
              {isSummaryAlert && (
                <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                  {(alert as any).calculation_details?.total_affected || alert.current_value || 0} sản phẩm
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-300">{alert.title}</p>
            {alert.message && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{alert.message}</p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="min-h-[300px]">
          {!recommendations && !isGenerating && (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-purple-500/10 w-fit mx-auto mb-4">
                <Lightbulb className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-slate-200 font-medium mb-2">
                AI sẽ phân tích và đề xuất
              </h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                {isSummaryAlert 
                  ? `Phân tích ${products?.length || 0} sản phẩm trong cảnh báo này và đưa ra đề xuất nên nhập hay không nên nhập.`
                  : 'Phân tích sản phẩm cụ thể trong cảnh báo và đưa ra khuyến nghị hành động.'}
              </p>
              <Button
                onClick={generateRecommendations}
                disabled={productsLoading}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {productsLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang tải dữ liệu...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Tạo đề xuất ngay
                  </>
                )}
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-slate-300">Đang phân tích dữ liệu...</p>
              <p className="text-slate-500 text-sm mt-1">AI đang tạo đề xuất cho bạn</p>
            </div>
          )}

          {recommendations && !isGenerating && (
            <ScrollArea className="h-[350px] pr-4">
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
              
              {/* Regenerate button */}
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateRecommendations}
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Tạo lại đề xuất
                </Button>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
