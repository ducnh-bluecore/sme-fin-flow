import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, RefreshCw, Sparkles, AlertTriangle, TrendingUp, Lightbulb, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIInsights, useRefreshAIInsights } from '@/hooks/useAIInsights';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

export function AIInsightsPanel() {
  const [hasStarted, setHasStarted] = useState(false);
  const { data, isLoading, error } = useAIInsights(hasStarted);
  const refreshMutation = useRefreshAIInsights();
  const { toast } = useToast();

  const handleRefresh = async () => {
    setHasStarted(true);
    if (data) {
      try {
        await refreshMutation.mutateAsync();
        toast({
          title: "Đã cập nhật",
          description: "Phân tích AI đã được làm mới",
        });
      } catch (err) {
        toast({
          title: "Lỗi",
          description: err instanceof Error ? err.message : "Không thể cập nhật phân tích",
          variant: "destructive",
        });
      }
    }
  };

  // Show "Start Analysis" button if not yet started
  if (!hasStarted) {
    return (
      <Card className="col-span-full border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Phân tích Tài chính
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nhấn nút để bắt đầu phân tích
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Phân tích AI sẽ đánh giá tình hình tài chính dựa trên dữ liệu hiện có
          </p>
          <Button onClick={() => setHasStarted(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Bắt đầu phân tích AI
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>AI đang phân tích dữ liệu tài chính...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="col-span-full border-destructive/50">
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Không thể tải phân tích AI</span>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Thử lại
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="col-span-full"
    >
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Phân tích Tài chính
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cập nhật lúc {new Date(data.generatedAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <QuickStat
              label="Doanh thu"
              value={formatCurrency(data.summary.netRevenue)}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <QuickStat
              label="Đơn hàng"
              value={`${data.summary.orderCount}`}
            />
            <QuickStat
              label="AOV"
              value={formatCurrency(data.summary.aov)}
            />
            <QuickStat
              label="Gross Margin"
              value={`${(data.summary.grossMarginPct || 0).toFixed(1)}%`}
            />
          </div>

          {/* AI Analysis */}
          <div className="rounded-lg bg-muted/30 p-4 prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-2 first:mt-0">{children}</h3>,
                h2: ({ children }) => <h4 className="text-sm font-semibold mt-3 mb-2">{children}</h4>,
                h3: ({ children }) => <h5 className="text-sm font-medium mt-2 mb-1">{children}</h5>,
                p: ({ children }) => <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="text-sm space-y-1 mb-2">{children}</ul>,
                li: ({ children }) => <li className="text-muted-foreground flex items-start gap-2"><span className="text-primary mt-1.5">•</span><span>{children}</span></li>,
                strong: ({ children }) => <strong className="text-foreground font-medium">{children}</strong>,
              }}
            >
              {data.analysis}
            </ReactMarkdown>
          </div>

          {/* Action hint */}
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" />
            <span>AI phân tích tự động cập nhật mỗi 10 phút hoặc khi có dữ liệu mới</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QuickStat({ 
  label, 
  value, 
  icon,
  warning 
}: { 
  label: string; 
  value: string; 
  icon?: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 ${warning ? 'bg-destructive/10' : 'bg-muted/50'}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-semibold ${warning ? 'text-destructive' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString('vi-VN');
}
