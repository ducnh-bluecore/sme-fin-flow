import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Download,
  Upload,
  ArrowRight,
  Zap,
  FileSpreadsheet,
  Table,
  Settings,
  Play,
  History,
  Filter,
  Plug,
  Loader2,
  Search,
  Building2,
  Activity,
  Wifi,
  WifiOff,
  Pause,
  MoreVertical,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FileImportDialog } from '@/components/import/FileImportDialog';
import { AddConnectorDialog } from '@/components/connectors/AddConnectorDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { useConnectorIntegrations } from '@/hooks/useConnectorIntegrations';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useBankAccounts } from '@/hooks/useBankData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const connectorLogos: Record<string, string> = {
  shopee: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopee_logo.svg/240px-Shopee_logo.svg.png',
  lazada: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Lazada_%282019%29.svg/240px-Lazada_%282019%29.svg.png',
  tiki: 'https://upload.wikimedia.org/wikipedia/vi/thumb/2/2f/Tiki_logo.svg/240px-Tiki_logo.svg.png',
  tiktok: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/TikTok_logo.svg/200px-TikTok_logo.svg.png',
  sendo: 'https://upload.wikimedia.org/wikipedia/vi/thumb/b/b3/Logo_Sendo.svg/240px-Logo_Sendo.svg.png',
  bigquery: 'https://www.vectorlogo.zone/logos/google_bigquery/google_bigquery-icon.svg',
  googlesheets: 'https://www.gstatic.com/images/branding/product/2x/sheets_2020q4_48dp.png',
  manual: 'https://cdn-icons-png.flaticon.com/512/4185/4185540.png',
};

const statusConfig = {
  active: { label: 'Hoạt động', icon: CheckCircle2, color: 'text-success bg-success/10' },
  inactive: { label: 'Tạm dừng', icon: Pause, color: 'text-muted-foreground bg-muted' },
  error: { label: 'Lỗi', icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
  syncing: { label: 'Đang đồng bộ', icon: RefreshCw, color: 'text-info bg-info/10' },
};

interface ImportJob {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  records_total: number;
  records_processed: number;
  records_failed: number;
  created_at: string;
}

export default function DataHubPage() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addConnectorOpen, setAddConnectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: tenantId } = useActiveTenantId();

  const { integrations = [], isLoading: loadingConnectors, syncIntegration, deleteIntegration } = useConnectorIntegrations();
  const { data: bankAccounts = [], isLoading: loadingBanks } = useBankAccounts();

  const { data: importJobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['import-jobs', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const completedJobs = (importJobs as ImportJob[]).filter((j) => j.status === 'completed');
  const totalRecords = completedJobs.reduce((sum, j) => sum + (j.records_processed || 0), 0);
  const activeConnectors = integrations.filter(c => c.status === 'active').length;
  const errorConnectors = integrations.filter(c => c.status === 'error').length;
  const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  // Filter out bigquery from other connectors list (shown separately above)
  const filteredConnectors = integrations.filter(c => 
    c.connector_type !== 'bigquery' &&
    (c.connector_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSync = async (id: string) => {
    toast.info('Đang đồng bộ...');
    await syncIntegration.mutateAsync(id);
  };

  const handleSyncAll = () => {
    toast.info('Đang đồng bộ tất cả kết nối...');
    integrations.filter(i => i.status === 'active').forEach(i => syncIntegration.mutate(i.id));
  };

  return (
    <>
      <Helmet>
        <title>Data Hub | Bluecore Finance</title>
        <meta name="description" content="Trung tâm quản lý dữ liệu và kết nối" />
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
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Data Hub</h1>
              <p className="text-muted-foreground">Trung tâm quản lý dữ liệu và kết nối</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSyncAll}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Đồng bộ tất cả
            </Button>
            <Button size="sm" onClick={() => setAddConnectorOpen(true)}>
              <Plug className="w-4 h-4 mr-2" />
              Thêm kết nối
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalRecords.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Tổng bản ghi</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Wifi className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeConnectors}</p>
                  <p className="text-xs text-muted-foreground">Kết nối hoạt động</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Building2 className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bankAccounts.length}</p>
                  <p className="text-xs text-muted-foreground">Tài khoản ngân hàng</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{errorConnectors}</p>
                  <p className="text-xs text-muted-foreground">Kết nối lỗi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="connectors" className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="connectors">Kết nối</TabsTrigger>
            <TabsTrigger value="banks">Ngân hàng</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="status">Trạng thái</TabsTrigger>
          </TabsList>

          {/* Connectors Tab */}
          <TabsContent value="connectors" className="space-y-6">
            {/* BigQuery / Data Warehouse Section */}
            {(() => {
              const bigqueryConnector = integrations.find(c => c.connector_type === 'bigquery');
              return (
                <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-info/5">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-white shadow-sm">
                          <img 
                            src={connectorLogos.bigquery}
                            alt="BigQuery"
                            className="w-8 h-8 object-contain"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">Data Warehouse (BigQuery)</p>
                            {bigqueryConnector ? (
                              <Badge className="text-xs bg-success/10 text-success">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Đã kết nối
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Chưa kết nối
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {bigqueryConnector 
                              ? `Project: ${(bigqueryConnector.settings as any)?.project_id || 'N/A'}${bigqueryConnector.last_sync_at ? ` • Đồng bộ: ${formatDate(bigqueryConnector.last_sync_at)}` : ''}`
                              : 'Kết nối với Google BigQuery để đồng bộ dữ liệu'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {bigqueryConnector && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSync(bigqueryConnector.id)}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Đồng bộ
                          </Button>
                        )}
                        <Link to="/data-warehouse">
                          <Button variant={bigqueryConnector ? "ghost" : "default"} size="sm">
                            {bigqueryConnector ? (
                              <>
                                <Settings className="w-4 h-4 mr-1" />
                                Cấu hình
                              </>
                            ) : (
                              <>
                                <Plug className="w-4 h-4 mr-1" />
                                Kết nối
                              </>
                            )}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Other Connectors */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm kết nối..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-muted-foreground">Các kết nối khác</p>
            </div>

            {loadingConnectors ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
              </div>
            ) : filteredConnectors.length === 0 ? (
              <Card className="p-12 text-center">
                <WifiOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">Chưa có kết nối nào</p>
                <Button onClick={() => setAddConnectorOpen(true)}>
                  <Plug className="w-4 h-4 mr-2" />
                  Thêm kết nối đầu tiên
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredConnectors.map((connector) => {
                  const config = statusConfig[connector.status as keyof typeof statusConfig] || statusConfig.inactive;
                  const StatusIcon = config.icon;
                  
                  return (
                    <motion.div
                      key={connector.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="hover:border-primary/50 transition-colors">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={connectorLogos[connector.connector_type] || connectorLogos.manual}
                                alt={connector.connector_name}
                                className="w-10 h-10 object-contain rounded-lg"
                              />
                              <div>
                                <p className="font-semibold">{connector.connector_name}</p>
                                <p className="text-xs text-muted-foreground">{connector.shop_name || connector.connector_type}</p>
                              </div>
                            </div>
                            <Badge className={cn('text-xs', config.color)}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-muted-foreground mb-4">
                            {connector.last_sync_at 
                              ? `Đồng bộ lần cuối: ${formatDate(connector.last_sync_at)}`
                              : 'Chưa đồng bộ'}
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleSync(connector.id)}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Đồng bộ
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Banks Tab */}
          <TabsContent value="banks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tài khoản ngân hàng đã kết nối</h3>
              <Link to="/bank-connections">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Quản lý
                </Button>
              </Link>
            </div>

            {loadingBanks ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
              </div>
            ) : bankAccounts.length === 0 ? (
              <Card className="p-12 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">Chưa kết nối tài khoản ngân hàng</p>
                <Link to="/bank-connections">
                  <Button>
                    <Building2 className="w-4 h-4 mr-2" />
                    Kết nối ngân hàng
                  </Button>
                </Link>
              </Card>
            ) : (
              <>
                <Card className="p-4 bg-gradient-to-r from-primary/10 to-info/10 border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng số dư</p>
                      <p className="text-3xl font-bold text-primary">{formatCurrency(totalBankBalance)}</p>
                    </div>
                    <Building2 className="w-12 h-12 text-primary/30" />
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {bankAccounts.map((account) => (
                    <Card key={account.id} className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          <span className="font-semibold">{account.bank_name}</span>
                        </div>
                        <Badge variant="outline">***{account.account_number.slice(-4)}</Badge>
                      </div>
                      <p className="text-2xl font-bold mb-2">{formatCurrency(account.current_balance || 0)}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.last_sync_at 
                          ? `Cập nhật: ${formatDate(account.last_sync_at)}`
                          : 'Chưa đồng bộ'}
                      </p>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Import dữ liệu từ file</h3>
              <Button size="sm" onClick={() => setImportDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import File
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className="hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setImportDialogOpen(true)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium">Import Excel/CSV</p>
                      <p className="text-sm text-muted-foreground">Tải lên file dữ liệu</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Link to="/etl-rules">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-500/10">
                        <Settings className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">Cấu hình ETL</p>
                        <p className="text-sm text-muted-foreground">Quy tắc chuyển đổi dữ liệu</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-purple-500/10">
                      <Play className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">Chạy đồng bộ</p>
                      <p className="text-sm text-muted-foreground">Đồng bộ thủ công</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Import Jobs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lịch sử Import gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingJobs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (importJobs as ImportJob[]).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có lịch sử import
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(importJobs as ImportJob[]).slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Table className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{job.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(job.created_at).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {job.records_processed.toLocaleString()} bản ghi
                          </span>
                          <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                            {job.status === 'completed' ? 'Hoàn thành' : job.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  ETL Pipeline Status
                </CardTitle>
                <CardDescription>Quy trình xử lý và nạp dữ liệu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-6 overflow-x-auto">
                  {[
                    { icon: Upload, label: 'Upload', sub: 'CSV, Excel, JSON', count: importJobs.length },
                    { icon: Filter, label: 'Validate', sub: 'Kiểm tra định dạng', count: totalRecords },
                    { icon: RefreshCw, label: 'Transform', sub: 'Chuẩn hóa & Map', count: totalRecords },
                    { icon: Download, label: 'Load', sub: 'Nạp vào hệ thống', count: totalRecords },
                    { icon: Database, label: 'Analytics', sub: 'Sẵn sàng phân tích', count: activeConnectors },
                  ].map((step, idx) => (
                    <div key={step.label} className="flex items-center gap-4">
                      <div className="text-center min-w-[100px]">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 mx-auto">
                          <step.icon className="w-7 h-7 text-primary" />
                        </div>
                        <p className="text-sm font-medium">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.sub}</p>
                        <p className="text-lg font-bold text-primary mt-1">
                          {step.count.toLocaleString()}
                        </p>
                      </div>
                      {idx < 4 && (
                        <ArrowRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Connection Health */}
            <Card>
              <CardHeader>
                <CardTitle>Tình trạng kết nối</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {integrations.map((connector) => {
                    const config = statusConfig[connector.status as keyof typeof statusConfig] || statusConfig.inactive;
                    
                    return (
                      <div key={connector.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <img 
                            src={connectorLogos[connector.connector_type] || connectorLogos.manual}
                            alt={connector.connector_name}
                            className="w-8 h-8 object-contain rounded"
                          />
                          <div>
                            <p className="font-medium">{connector.connector_name}</p>
                            <p className="text-xs text-muted-foreground">{connector.shop_name}</p>
                          </div>
                        </div>
                        <Badge className={cn('text-xs', config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                    );
                  })}
                  
                  {integrations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Chưa có kết nối nào
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <FileImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <AddConnectorDialog open={addConnectorOpen} onOpenChange={setAddConnectorOpen} />
    </>
  );
}
