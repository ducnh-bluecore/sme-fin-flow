import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  CreditCard,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  TestTube,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

interface BankConnection {
  id: string;
  bank_code: string;
  bank_name: string;
  connection_type: string;
  status: string;
  last_sync_at?: string | null;
  transaction_count?: number | null;
  is_configured: boolean;
}

const availableBanks = [
  { code: 'VCB', name: 'Vietcombank', type: 'bank' as const, logo: '🏦' },
  { code: 'BIDV', name: 'BIDV', type: 'bank' as const, logo: '🏦' },
  { code: 'TCB', name: 'Techcombank', type: 'bank' as const, logo: '🏦' },
  { code: 'CTG', name: 'VietinBank', type: 'bank' as const, logo: '🏦' },
  { code: 'MBBANK', name: 'MB Bank', type: 'bank' as const, logo: '🏦' },
  { code: 'ACB', name: 'Ngân hàng Á Châu', type: 'bank' as const, logo: '🏦' },
  { code: 'VIB', name: 'VIB - Quốc tế Việt Nam', type: 'bank' as const, logo: '🏦' },
  { code: 'TPBANK', name: 'TPBank - Tiên Phong', type: 'bank' as const, logo: '🏦' },
  { code: 'HDBANK', name: 'HDBank - Phát triển TP.HCM', type: 'bank' as const, logo: '🏦' },
  { code: 'OCB', name: 'OCB - Phương Đông', type: 'bank' as const, logo: '🏦' },
  { code: 'SHB', name: 'SHB - Sài Gòn Hà Nội', type: 'bank' as const, logo: '🏦' },
  { code: 'MOMO', name: 'Momo', type: 'payment' as const, logo: '💳' },
  { code: 'VNPAY', name: 'VNPay', type: 'payment' as const, logo: '💳' },
];

const credentialFields: Record<string, { label: string; placeholder: string; type: string }[]> = {
  VCB: [
    { label: 'API Key', placeholder: 'Nhập VCB API Key', type: 'password' },
    { label: 'API Secret', placeholder: 'Nhập VCB API Secret', type: 'password' },
    { label: 'Số tài khoản', placeholder: 'Nhập số tài khoản', type: 'text' },
  ],
  BIDV: [
    { label: 'Client ID', placeholder: 'Nhập BIDV Client ID', type: 'password' },
    { label: 'Client Secret', placeholder: 'Nhập BIDV Client Secret', type: 'password' },
    { label: 'Số tài khoản', placeholder: 'Nhập số tài khoản', type: 'text' },
  ],
  DEFAULT: [
    { label: 'API Key', placeholder: 'Nhập API Key', type: 'password' },
    { label: 'API Secret', placeholder: 'Nhập API Secret', type: 'password' },
    { label: 'Số tài khoản', placeholder: 'Nhập số tài khoản', type: 'text' },
  ],
  MOMO: [
    { label: 'Partner Code', placeholder: 'Nhập Momo Partner Code', type: 'text' },
    { label: 'Access Key', placeholder: 'Nhập Momo Access Key', type: 'password' },
    { label: 'Secret Key', placeholder: 'Nhập Momo Secret Key', type: 'password' },
  ],
  VNPAY: [
    { label: 'TMN Code', placeholder: 'Nhập VNPay TMN Code', type: 'text' },
    { label: 'Hash Secret', placeholder: 'Nhập VNPay Hash Secret', type: 'password' },
  ],
};

export default function BankConnectionsPage() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();
  const [selectedConnection, setSelectedConnection] = useState<BankConnection | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['bank-connections', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('bank_connection_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('bank_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Merge available banks with configured connections
  const allConnections: BankConnection[] = availableBanks.map(bank => {
    const configured = (connections as BankConnection[]).find((c) => c.bank_code === bank.code);
    return configured || {
      id: bank.code,
      bank_code: bank.code,
      bank_name: bank.name,
      connection_type: bank.type,
      status: 'disconnected',
      is_configured: false,
    };
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Đã kết nối
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="w-3 h-3 mr-1" />
            Lỗi
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            <WifiOff className="w-3 h-3 mr-1" />
            Chưa kết nối
          </Badge>
        );
    }
  };

  const handleConfigure = (connection: BankConnection) => {
    setSelectedConnection(connection);
    setFormData({});
    setIsConfigDialogOpen(true);
  };

  const handleSaveCredentials = async () => {
    if (!selectedConnection || !tenantId) return;

    const fields = credentialFields[selectedConnection.bank_code] || credentialFields.DEFAULT;
    const allFilled = fields.every((field) => formData[field.label]?.trim());

    if (!allFilled) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    // Upsert connection config
    const { error } = await supabase
      .from('bank_connection_configs')
      .upsert({
        tenant_id: tenantId,
        bank_code: selectedConnection.bank_code,
        bank_name: selectedConnection.bank_name,
        connection_type: selectedConnection.connection_type,
        is_configured: true,
        status: 'disconnected',
      }, { onConflict: 'tenant_id,bank_code' });

    if (error) {
      toast.error('Không thể lưu cấu hình');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['bank-connections', tenantId] });
    toast.success(`Đã lưu cấu hình ${selectedConnection.bank_name}`);
    setIsConfigDialogOpen(false);
    setFormData({});
    setSelectedConnection(null);
  };

  const handleTestConnection = async (connection: BankConnection) => {
    if (!connection.is_configured) {
      toast.error('Vui lòng cấu hình kết nối trước');
      return;
    }

    setIsTesting(connection.bank_code);

    // Simulate API test
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const success = Math.random() > 0.3;

    if (tenantId) {
      await supabase
        .from('bank_connection_configs')
        .update({
          status: success ? 'connected' : 'error',
          last_sync_at: success ? new Date().toISOString() : null,
          transaction_count: success ? Math.floor(Math.random() * 1000) + 100 : 0,
        })
        .eq('tenant_id', tenantId)
        .eq('bank_code', connection.bank_code);

      queryClient.invalidateQueries({ queryKey: ['bank-connections', tenantId] });
    }

    if (success) {
      toast.success(`Kết nối ${connection.bank_name} thành công!`);
    } else {
      toast.error(`Không thể kết nối ${connection.bank_name}. Vui lòng kiểm tra lại thông tin.`);
    }

    setIsTesting(null);
  };

  const handleDisconnect = async (connection: BankConnection) => {
    if (!tenantId) return;

    await supabase
      .from('bank_connection_configs')
      .update({
        status: 'disconnected',
        is_configured: false,
      })
      .eq('tenant_id', tenantId)
      .eq('bank_code', connection.bank_code);

    queryClient.invalidateQueries({ queryKey: ['bank-connections', tenantId] });
    toast.success(`Đã ngắt kết nối ${connection.bank_name}`);
  };

  const toggleSecretVisibility = (fieldKey: string) => {
    setShowSecrets((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const bankConnections = allConnections.filter((c) => c.connection_type === 'bank');
  const paymentConnections = allConnections.filter((c) => c.connection_type === 'payment');
  const connectedCount = (connections as BankConnection[]).filter((c) => c.status === 'connected').length;

  const ConnectionCard = ({ connection }: { connection: BankConnection }) => {
    const bank = availableBanks.find(b => b.code === connection.bank_code);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <div
            className={cn(
              'absolute top-0 left-0 right-0 h-1',
              connection.status === 'connected' && 'bg-success',
              connection.status === 'error' && 'bg-destructive',
              connection.status === 'disconnected' && 'bg-muted'
            )}
          />
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
                  {bank?.logo || '🏦'}
                </div>
                <div>
                  <CardTitle className="text-lg">{connection.bank_name}</CardTitle>
                  <CardDescription>{connection.bank_code}</CardDescription>
                </div>
              </div>
              {getStatusBadge(connection.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {connection.status === 'connected' && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Đồng bộ lần cuối</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {connection.last_sync_at
                      ? new Date(connection.last_sync_at).toLocaleString('vi-VN')
                      : 'Chưa đồng bộ'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Giao dịch</p>
                  <p className="text-sm font-medium">{(connection.transaction_count || 0).toLocaleString('vi-VN')}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleConfigure(connection)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Cấu hình
              </Button>
              <Button
                variant={connection.status === 'connected' ? 'secondary' : 'default'}
                size="sm"
                className="flex-1"
                onClick={() => handleTestConnection(connection)}
                disabled={isTesting === connection.bank_code}
              >
                {isTesting === connection.bank_code ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Kiểm tra
                  </>
                )}
              </Button>
            </div>

            {connection.status === 'connected' && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDisconnect(connection)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Ngắt kết nối
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kết nối ngân hàng & Cổng thanh toán</h1>
          <p className="text-muted-foreground">
            Cấu hình và quản lý kết nối với các ngân hàng và cổng thanh toán Việt Nam
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="py-1.5">
            <Wifi className="w-3 h-3 mr-1 text-success" />
            {connectedCount} / {allConnections.length} kết nối
          </Badge>
        </div>
      </div>

      {/* Connection Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wifi className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{connectedCount}</p>
                <p className="text-sm text-muted-foreground">Đang hoạt động</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bankConnections.length}</p>
                <p className="text-sm text-muted-foreground">Ngân hàng</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paymentConnections.length}</p>
                <p className="text-sm text-muted-foreground">Cổng thanh toán</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(connections as BankConnection[]).filter((c) => c.status === 'error').length}
                </p>
                <p className="text-sm text-muted-foreground">Cần kiểm tra</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="banks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="banks" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Ngân hàng ({bankConnections.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Cổng thanh toán ({paymentConnections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="banks">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankConnections.map((connection) => (
              <ConnectionCard key={connection.bank_code} connection={connection} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentConnections.map((connection) => (
              <ConnectionCard key={connection.bank_code} connection={connection} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cấu hình {selectedConnection?.bank_name}</DialogTitle>
            <DialogDescription>
              Nhập thông tin xác thực để kết nối với {selectedConnection?.bank_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedConnection &&
              (credentialFields[selectedConnection.bank_code] || credentialFields.DEFAULT).map((field) => (
                <div key={field.label} className="space-y-2">
                  <Label>{field.label}</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets[field.label] ? 'text' : field.type}
                      placeholder={field.placeholder}
                      value={formData[field.label] || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, [field.label]: e.target.value }))
                      }
                    />
                    {field.type === 'password' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => toggleSecretVisibility(field.label)}
                      >
                        {showSecrets[field.label] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveCredentials}>Lưu cấu hình</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}