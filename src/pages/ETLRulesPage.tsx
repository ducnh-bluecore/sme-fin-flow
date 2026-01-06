import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Workflow, 
  Play, 
  Pause, 
  Plus,
  Settings,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Database,
  FileSpreadsheet,
  Zap,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

const statusConfig = {
  running: { label: 'Đang chạy', color: 'text-info', bg: 'bg-info/10', icon: Play },
  success: { label: 'Thành công', color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
  error: { label: 'Lỗi', color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
  idle: { label: 'Tạm dừng', color: 'text-muted-foreground', bg: 'bg-muted', icon: Pause },
};

export default function ETLRulesPage() {
  const { data: tenantId } = useActiveTenantId();

  const { data: etlPipelines = [], isLoading: loadingPipelines } = useQuery({
    queryKey: ['etl-pipelines', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('etl_pipelines')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: transformRules = [], isLoading: loadingRules } = useQuery({
    queryKey: ['etl-transform-rules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('etl_transform_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const runningCount = etlPipelines.filter(p => p.status === 'running').length;
  const totalProcessed = etlPipelines.reduce((sum, p) => sum + (p.records_processed || 0), 0);

  return (
    <>
      <Helmet>
        <title>Quy tắc ETL | Bluecore Finance</title>
        <meta name="description" content="Quản lý quy tắc ETL và data pipelines" />
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
              <Workflow className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Quy tắc ETL</h1>
              <p className="text-muted-foreground">ETL Rules & Data Pipelines</p>
            </div>
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Tạo pipeline mới
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-info" />
                <span className="text-sm text-muted-foreground">Đang chạy</span>
              </div>
              <p className="text-2xl font-bold">{loadingPipelines ? '-' : runningCount} pipelines</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-5 h-5 text-success" />
                <span className="text-sm text-muted-foreground">Bản ghi xử lý hôm nay</span>
              </div>
              <p className="text-2xl font-bold">{loadingPipelines ? '-' : totalProcessed.toLocaleString()}</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <FileSpreadsheet className="w-5 h-5 text-warning" />
                <span className="text-sm text-muted-foreground">Quy tắc transform</span>
              </div>
              <p className="text-2xl font-bold">{loadingRules ? '-' : transformRules.length}</p>
            </Card>
          </motion.div>
        </div>

        {/* Pipelines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="data-card"
        >
          <h3 className="font-semibold text-lg mb-4">Data Pipelines</h3>
          {loadingPipelines ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : etlPipelines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Chưa có pipeline nào được cấu hình.
            </div>
          ) : (
            <div className="space-y-4">
              {etlPipelines.map((pipeline) => {
                const config = statusConfig[pipeline.status as keyof typeof statusConfig] || statusConfig.idle;
                const StatusIcon = config.icon;
                
                return (
                  <Card key={pipeline.id} className="p-4 bg-card shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Switch checked={pipeline.enabled} />
                        <div>
                          <h4 className="font-semibold">{pipeline.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span>{pipeline.source}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{pipeline.destination}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={cn('flex items-center gap-1 justify-end', config.color)}>
                            <StatusIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{config.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {pipeline.schedule || 'Không lịch'}
                          </p>
                        </div>
                        
                        <div className="text-right min-w-[100px]">
                          <p className="text-sm font-medium">{(pipeline.records_processed || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">bản ghi</p>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            {pipeline.status === 'running' ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {pipeline.error_message && (
                      <div className="mt-3 p-2 rounded bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {pipeline.error_message}
                      </div>
                    )}
                    
                    {pipeline.status === 'running' && (
                      <div className="mt-3">
                        <Progress value={65} className="h-1.5" />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Transform Rules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="data-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Quy tắc Transform</h3>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Thêm quy tắc
            </Button>
          </div>
          {loadingRules ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : transformRules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Chưa có quy tắc transform nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transformRules.map((rule) => (
                <Card key={rule.id} className="p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rule.name}</h4>
                    <Badge variant="outline">{rule.rule_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rule.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}