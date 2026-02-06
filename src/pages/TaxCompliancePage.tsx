import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  FileCheck, 
  Calendar, 
  CheckCircle2,
  Clock,
  FileText,
  Calculator,
  Upload,
  Eye,
  Inbox,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { differenceInDays, parseISO } from 'date-fns';

const statusConfig = {
  paid: { label: 'Đã nộp', color: 'text-success', bg: 'bg-success/10' },
  submitted: { label: 'Đã kê khai', color: 'text-info', bg: 'bg-info/10' },
  pending: { label: 'Chờ xử lý', color: 'text-warning', bg: 'bg-warning/10' },
  overdue: { label: 'Quá hạn', color: 'text-destructive', bg: 'bg-destructive/10' },
};

export default function TaxCompliancePage() {
  const [isCalculating, setIsCalculating] = useState(false);
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  // Fetch tax obligations
  const { data: taxObligations = [], isLoading: loadingObligations } = useQuery({
    queryKey: ['tax-obligations', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('tax_obligations', '*')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  // Fetch tax filings
  const { data: taxFilings = [], isLoading: loadingFilings } = useQuery({
    queryKey: ['tax-filings', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('tax_filings', '*')
        .order('submitted_date', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  const isLoading = loadingObligations || loadingFilings;
  const hasData = taxObligations.length > 0;
  
  const totalTaxDue = taxObligations.reduce((sum, t) => sum + (t.status !== 'paid' ? Number(t.amount) : 0), 0);
  const totalPaid = taxObligations.reduce((sum, t) => sum + (t.status === 'paid' ? Number(t.amount) : 0), 0);

  // Calculate upcoming deadlines from obligations
  const upcomingDeadlines = taxObligations
    .filter(t => t.status !== 'paid')
    .map(t => {
      const daysLeft = differenceInDays(parseISO(t.due_date), new Date());
      return {
        name: `${t.name} - ${t.period}`,
        date: t.due_date,
        daysLeft,
        priority: daysLeft <= 7 ? 'high' : daysLeft <= 14 ? 'medium' : 'low',
      };
    })
    .filter(d => d.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const handleCalculateTax = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      toast.success('Đã tính thuế thành công', {
        description: `Tổng thuế phải nộp: ${formatCurrency(totalTaxDue)}`,
      });
    }, 1500);
  };

  const handleSubmitDeclaration = () => {
    toast.info('Chức năng nộp tờ khai đang phát triển');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Thuế & Tuân thủ | Bluecore Finance</title>
        <meta name="description" content="Quản lý thuế và tuân thủ pháp luật" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Thuế & Tuân thủ</h1>
              <p className="text-muted-foreground">Tax & Compliance Management</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCalculateTax}
              disabled={isCalculating}
            >
              <Calculator className="w-4 h-4 mr-2" />
              {isCalculating ? 'Đang tính...' : 'Tính thuế'}
            </Button>
            <Button size="sm" onClick={handleSubmitDeclaration}>
              <Upload className="w-4 h-4 mr-2" />
              Nộp tờ khai
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <span className="text-sm text-muted-foreground">Thuế phải nộp</span>
              </div>
              <p className="text-2xl font-bold text-warning">
                {hasData ? formatCurrency(totalTaxDue) : '--'}
              </p>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">Đã nộp</span>
              </div>
              <p className="text-2xl font-bold text-success">
                {hasData ? formatCurrency(totalPaid) : '--'}
              </p>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-info" />
                </div>
                <span className="text-sm text-muted-foreground">Tờ khai đã nộp</span>
              </div>
              <p className="text-2xl font-bold text-info">
                {taxFilings.length > 0 ? taxFilings.length : '--'}
              </p>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tax Obligations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 data-card"
          >
            <h3 className="font-semibold text-lg mb-4">Nghĩa vụ thuế</h3>
            {taxObligations.length > 0 ? (
              <div className="space-y-4">
                {taxObligations.map((tax) => {
                  const config = statusConfig[tax.status as keyof typeof statusConfig] || statusConfig.pending;
                  return (
                    <div key={tax.id} className="p-4 rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{tax.name}</h4>
                          <p className="text-sm text-muted-foreground">{tax.period}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(Number(tax.amount))}</p>
                          <Badge className={cn('text-xs', config.bg, config.color)} variant="outline">
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Tiến độ</span>
                            <span>{tax.progress}%</span>
                          </div>
                          <Progress value={tax.progress} className="h-1.5" />
                        </div>
                        <div className="text-right text-sm">
                          <span className="text-muted-foreground">Hạn: </span>
                          <span className="font-medium">{formatDate(tax.due_date)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Inbox className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Chưa có dữ liệu nghĩa vụ thuế</p>
              </div>
            )}
          </motion.div>

          {/* Upcoming Deadlines */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <Card className="p-5 bg-card shadow-card">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Deadline sắp tới
              </h3>
              {upcomingDeadlines.length > 0 ? (
                <div className="space-y-3">
                  {upcomingDeadlines.map((deadline, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium text-sm">{deadline.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(deadline.date)}</p>
                      </div>
                      <Badge 
                        variant={deadline.priority === 'high' ? 'destructive' : deadline.priority === 'medium' ? 'secondary' : 'outline'}
                      >
                        {deadline.daysLeft} ngày
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Chưa có deadline
                </div>
              )}
            </Card>

            <Card className="p-5 bg-card shadow-card">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Tờ khai gần đây
              </h3>
              {taxFilings.length > 0 ? (
                <div className="space-y-3">
                  {taxFilings.map((filing) => (
                    <div key={filing.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium text-sm">{filing.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {filing.submitted_date ? formatDate(filing.submitted_date) : 'Chưa nộp'}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Chưa có tờ khai
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
}
