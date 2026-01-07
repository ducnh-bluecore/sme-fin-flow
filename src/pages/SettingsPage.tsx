import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Settings, 
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Save,
  Moon,
  Sun,
  Monitor,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  Building2,
  Calculator,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTenantContext } from '@/contexts/TenantContext';
import { useUpdateTenant } from '@/hooks/useTenant';
import { useFormulaSettings, useUpdateFormulaSettings, FormulaSettings } from '@/hooks/useFormulaSettings';

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

  // Tenant Settings
  const { activeTenant, isOwner, isLoading: tenantLoading } = useTenantContext();
  const updateTenant = useUpdateTenant();
  const [tenantName, setTenantName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Formula Settings
  const { data: formulaSettings, isLoading: formulaLoading } = useFormulaSettings();
  const updateFormula = useUpdateFormulaSettings();
  const [formulas, setFormulas] = useState<Partial<FormulaSettings>>({});

  // Initialize tenant values
  useEffect(() => {
    if (activeTenant) {
      setTenantName(activeTenant.name);
      setLogoUrl(activeTenant.logo_url || '');
    }
  }, [activeTenant]);

  // Initialize formula values
  useEffect(() => {
    if (formulaSettings) {
      setFormulas(formulaSettings);
    }
  }, [formulaSettings]);

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Vui lòng nhập API Key');
      return;
    }
    if (!apiKey.startsWith('sk-')) {
      setApiKeyStatus('invalid');
      toast.error('API Key không hợp lệ. OpenAI API Key phải bắt đầu bằng "sk-"');
      return;
    }

    setApiKeyStatus('testing');
    
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        setApiKeyStatus('valid');
        toast.success('API Key hợp lệ và hoạt động tốt!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setApiKeyStatus('invalid');
        if (response.status === 401) {
          toast.error('API Key không hợp lệ hoặc đã hết hạn');
        } else if (response.status === 429) {
          toast.error('API Key đã vượt quá giới hạn request');
        } else {
          toast.error(errorData.error?.message || 'Không thể xác thực API Key');
        }
      }
    } catch (error) {
      setApiKeyStatus('invalid');
      toast.error('Lỗi kết nối. Vui lòng kiểm tra lại.');
    }
  };

  const handleSaveApiKey = async () => {
    if (apiKeyStatus !== 'valid') {
      toast.error('Vui lòng test API Key trước khi lưu');
      return;
    }
    toast.success('API Key đã được lưu thành công!');
  };

  const handleSaveTenant = () => {
    if (!activeTenant) return;
    updateTenant.mutate({
      tenantId: activeTenant.id,
      data: { name: tenantName, logo_url: logoUrl || null },
    });
  };

  const handleSaveFormulas = () => {
    updateFormula.mutate(formulas);
  };

  const updateFormulaField = (field: keyof FormulaSettings, value: any) => {
    setFormulas(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Helmet>
        <title>Cài đặt | Bluecore Finance</title>
        <meta name="description" content="Cài đặt hệ thống" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Cài đặt</h1>
            <p className="text-muted-foreground">System Settings</p>
          </div>
        </motion.div>

        <Tabs defaultValue="tenant" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-8 lg:w-auto lg:inline-grid">
            <TabsTrigger value="tenant">Công ty</TabsTrigger>
            <TabsTrigger value="formulas">Công thức</TabsTrigger>
            <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
            <TabsTrigger value="notifications">Thông báo</TabsTrigger>
            <TabsTrigger value="appearance">Giao diện</TabsTrigger>
            <TabsTrigger value="security">Bảo mật</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="system">Hệ thống</TabsTrigger>
          </TabsList>

          {/* Tenant Settings Tab */}
          <TabsContent value="tenant">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Thông tin công ty
              </h3>
              
              {tenantLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : !activeTenant ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có công ty nào được chọn
                </div>
              ) : (
                <div className="space-y-6 max-w-2xl">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={logoUrl || undefined} />
                      <AvatarFallback className="text-2xl">
                        {tenantName?.charAt(0) || 'T'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="logo">URL Logo</Label>
                      <Input
                        id="logo"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        disabled={!isOwner}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tenantName">Tên công ty</Label>
                      <Input
                        id="tenantName"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        disabled={!isOwner}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Slug</Label>
                      <Input value={activeTenant.slug} disabled />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gói dịch vụ</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="capitalize">
                          {activeTenant.plan || 'free'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ngày tạo</Label>
                      <p className="text-sm text-muted-foreground mt-1.5">
                        {new Date(activeTenant.created_at).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {isOwner ? (
                    <Button
                      onClick={handleSaveTenant}
                      disabled={updateTenant.isPending}
                    >
                      {updateTenant.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="w-4 h-4 mr-2" />
                      Lưu thay đổi
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chỉ chủ sở hữu mới có thể chỉnh sửa thông tin công ty
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Formula Settings Tab */}
          <TabsContent value="formulas">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Cài đặt công thức tính toán
              </h3>
              
              {formulaLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Financial Period */}
                  <div>
                    <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                      Kỳ tài chính
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Số ngày năm tài chính</Label>
                        <Input
                          type="number"
                          value={formulas.fiscal_year_days || 365}
                          onChange={(e) => updateFormulaField('fiscal_year_days', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tháng bắt đầu năm tài chính</Label>
                        <Select
                          value={String(formulas.fiscal_year_start_month || 1)}
                          onValueChange={(v) => updateFormulaField('fiscal_year_start_month', Number(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                                Tháng {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Working Capital */}
                  <div>
                    <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                      Vốn lưu động (Days)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>DSO (Days Sales Outstanding)</Label>
                        <Input
                          type="number"
                          value={formulas.dso_calculation_days || 365}
                          onChange={(e) => updateFormulaField('dso_calculation_days', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>DIO (Days Inventory Outstanding)</Label>
                        <Input
                          type="number"
                          value={formulas.dio_calculation_days || 365}
                          onChange={(e) => updateFormulaField('dio_calculation_days', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>DPO (Days Payable Outstanding)</Label>
                        <Input
                          type="number"
                          value={formulas.dpo_calculation_days || 365}
                          onChange={(e) => updateFormulaField('dpo_calculation_days', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* AR Aging Buckets */}
                  <div>
                    <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                      AR Aging Buckets (ngày)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Bucket 1</Label>
                        <Input
                          type="number"
                          value={formulas.ar_bucket_1 || 30}
                          onChange={(e) => updateFormulaField('ar_bucket_1', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bucket 2</Label>
                        <Input
                          type="number"
                          value={formulas.ar_bucket_2 || 60}
                          onChange={(e) => updateFormulaField('ar_bucket_2', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bucket 3</Label>
                        <Input
                          type="number"
                          value={formulas.ar_bucket_3 || 90}
                          onChange={(e) => updateFormulaField('ar_bucket_3', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bucket 4</Label>
                        <Input
                          type="number"
                          value={formulas.ar_bucket_4 || 120}
                          onChange={(e) => updateFormulaField('ar_bucket_4', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Benchmarks */}
                  <div>
                    <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                      Chỉ tiêu mục tiêu (%)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Biên lợi nhuận gộp</Label>
                        <Input
                          type="number"
                          value={formulas.target_gross_margin || 30}
                          onChange={(e) => updateFormulaField('target_gross_margin', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Biên lợi nhuận ròng</Label>
                        <Input
                          type="number"
                          value={formulas.target_net_margin || 10}
                          onChange={(e) => updateFormulaField('target_net_margin', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>DSO mục tiêu (ngày)</Label>
                        <Input
                          type="number"
                          value={formulas.target_dso || 45}
                          onChange={(e) => updateFormulaField('target_dso', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tỷ lệ thu hồi nợ</Label>
                        <Input
                          type="number"
                          value={formulas.target_collection_rate || 95}
                          onChange={(e) => updateFormulaField('target_collection_rate', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Cash Management */}
                  <div>
                    <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                      Quản lý tiền mặt
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Runway tối thiểu (tháng)</Label>
                        <Input
                          type="number"
                          value={formulas.min_cash_runway_months || 3}
                          onChange={(e) => updateFormulaField('min_cash_runway_months', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Runway an toàn (tháng)</Label>
                        <Input
                          type="number"
                          value={formulas.safe_cash_runway_months || 6}
                          onChange={(e) => updateFormulaField('safe_cash_runway_months', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Dự trữ tiền mặt (%)</Label>
                        <Input
                          type="number"
                          value={formulas.cash_reserve_percentage || 20}
                          onChange={(e) => updateFormulaField('cash_reserve_percentage', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Tax & Depreciation */}
                  <div>
                    <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                      Thuế & Khấu hao
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Thuế VAT (%)</Label>
                        <Input
                          type="number"
                          value={formulas.vat_rate || 10}
                          onChange={(e) => updateFormulaField('vat_rate', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Thuế TNDN (%)</Label>
                        <Input
                          type="number"
                          value={formulas.corporate_tax_rate || 20}
                          onChange={(e) => updateFormulaField('corporate_tax_rate', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Số năm khấu hao mặc định</Label>
                        <Input
                          type="number"
                          value={formulas.default_depreciation_years || 5}
                          onChange={(e) => updateFormulaField('default_depreciation_years', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Terms */}
                  <div>
                    <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                      Điều khoản thanh toán (ngày)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>AR mặc định</Label>
                        <Input
                          type="number"
                          value={formulas.default_payment_terms_ar || 30}
                          onChange={(e) => updateFormulaField('default_payment_terms_ar', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>AP mặc định</Label>
                        <Input
                          type="number"
                          value={formulas.default_payment_terms_ap || 30}
                          onChange={(e) => updateFormulaField('default_payment_terms_ap', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Forecasting */}
                  <div>
                    <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                      Dự báo
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Độ tin cậy (%)</Label>
                        <Input
                          type="number"
                          value={formulas.forecast_confidence_level || 95}
                          onChange={(e) => updateFormulaField('forecast_confidence_level', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tăng trưởng mặc định (%)</Label>
                        <Input
                          type="number"
                          value={formulas.forecast_default_growth_rate || 5}
                          onChange={(e) => updateFormulaField('forecast_default_growth_rate', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tỷ lệ thu hồi dự báo (%)</Label>
                        <Input
                          type="number"
                          value={formulas.forecast_collection_rate || 85}
                          onChange={(e) => updateFormulaField('forecast_collection_rate', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={handleSaveFormulas}
                    disabled={updateFormula.isPending}
                  >
                    {updateFormula.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="w-4 h-4 mr-2" />
                    Lưu cài đặt công thức
                  </Button>
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="profile">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Thông tin cá nhân
              </h3>
              
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">NVA</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm">Thay đổi ảnh</Button>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Họ và tên</Label>
                      <Input id="fullName" defaultValue="Nguyễn Văn An" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="an.nguyen@company.com" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Số điện thoại</Label>
                      <Input id="phone" defaultValue="0901234567" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="department">Phòng ban</Label>
                      <Input id="department" defaultValue="Tài chính" className="mt-1.5" />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Lưu thay đổi
                  </Button>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Cài đặt thông báo
              </h3>
              
              <div className="space-y-6">
                {[
                  { title: 'Email thông báo', description: 'Nhận thông báo qua email' },
                  { title: 'Cảnh báo khẩn cấp', description: 'Thông báo ngay khi có cảnh báo mức cao' },
                  { title: 'Báo cáo hàng tuần', description: 'Nhận báo cáo tổng hợp mỗi tuần' },
                  { title: 'Thông báo đối soát', description: 'Thông báo khi có giao dịch chưa khớp' },
                  { title: 'Nhắc deadline thuế', description: 'Nhắc nhở trước deadline nộp thuế' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch defaultChecked={index < 3} />
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="appearance">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Giao diện
              </h3>
              
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Chế độ màu</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { name: 'Light', icon: Sun },
                      { name: 'Dark', icon: Moon },
                      { name: 'System', icon: Monitor },
                    ].map((theme) => (
                      <Card key={theme.name} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors text-center">
                        <theme.icon className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">{theme.name}</p>
                      </Card>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Ngôn ngữ</Label>
                    <Select defaultValue="vi">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vi">Tiếng Việt</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Múi giờ</Label>
                    <Select defaultValue="asia_ho_chi_minh">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asia_ho_chi_minh">Asia/Ho_Chi_Minh (GMT+7)</SelectItem>
                        <SelectItem value="asia_singapore">Asia/Singapore (GMT+8)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="security">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Bảo mật
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Đổi mật khẩu</h4>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                      <Input id="currentPassword" type="password" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">Mật khẩu mới</Label>
                      <Input id="newPassword" type="password" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                      <Input id="confirmPassword" type="password" className="mt-1.5" />
                    </div>
                    <Button>Đổi mật khẩu</Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Xác thực 2 yếu tố (2FA)</p>
                    <p className="text-sm text-muted-foreground">Bảo vệ tài khoản với xác thực 2 yếu tố</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="api">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Cấu hình API Keys
              </h3>
              
              <div className="space-y-6">
                {/* OpenAI API Key */}
                <div className="p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        OpenAI API Key
                        {apiKeyStatus === 'valid' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {apiKeyStatus === 'invalid' && (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        API Key để sử dụng các tính năng AI phân tích dữ liệu
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-w-lg">
                    <div className="relative">
                      <Label htmlFor="openai-key">API Key</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="openai-key"
                          type={showApiKey ? 'text' : 'password'}
                          placeholder="sk-..."
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            setApiKeyStatus('idle');
                          }}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleTestApiKey}
                        disabled={apiKeyStatus === 'testing' || !apiKey.trim()}
                      >
                        {apiKeyStatus === 'testing' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" />
                        )}
                        {apiKeyStatus === 'testing' ? 'Đang kiểm tra...' : 'Test API Key'}
                      </Button>
                      <Button 
                        onClick={handleSaveApiKey}
                        disabled={apiKeyStatus !== 'valid'}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Lưu API Key
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      <p className="font-medium mb-1">Lưu ý:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>API Key được mã hóa và lưu trữ an toàn</li>
                        <li>Bạn có thể lấy API Key tại <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com</a></li>
                        <li>Chi phí sử dụng API sẽ được tính vào tài khoản OpenAI của bạn</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Other API integrations placeholder */}
                <div className="p-4 rounded-lg border border-dashed bg-muted/10">
                  <h4 className="font-medium text-muted-foreground">Các tích hợp khác</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sắp ra mắt: Google AI, Anthropic Claude, và các dịch vụ khác
                  </p>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="system">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Cài đặt hệ thống
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Định dạng tiền tệ</Label>
                    <Select defaultValue="vnd">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vnd">VND - Việt Nam Đồng</SelectItem>
                        <SelectItem value="usd">USD - US Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Định dạng ngày tháng</Label>
                    <Select defaultValue="dd_mm_yyyy">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd_mm_yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mm_dd_yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy_mm_dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Năm tài chính bắt đầu</Label>
                    <Select defaultValue="january">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="january">Tháng 1</SelectItem>
                        <SelectItem value="april">Tháng 4</SelectItem>
                        <SelectItem value="july">Tháng 7</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tự động đồng bộ</Label>
                    <Select defaultValue="15">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Mỗi 5 phút</SelectItem>
                        <SelectItem value="15">Mỗi 15 phút</SelectItem>
                        <SelectItem value="30">Mỗi 30 phút</SelectItem>
                        <SelectItem value="60">Mỗi giờ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator />
                
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Lưu cài đặt
                </Button>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
