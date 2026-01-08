import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Calculator,
  Save,
  RotateCcw,
  Loader2,
  Calendar,
  TrendingUp,
  Wallet,
  Percent,
  Clock,
  ShoppingCart,
  FileText,
  Building2,
  ChevronDown,
  ChevronUp,
  Info,
  Banknote,
  Package,
  Tag,
  Truck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFormulaSettings, useUpdateFormulaSettings, useDefaultFormulaSettings, FormulaSettings } from '@/hooks/useFormulaSettings';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SettingsSection({ title, description, icon, children, defaultOpen = true }: SettingsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {icon}
                </div>
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface InputWithTooltipProps {
  label: string;
  tooltip: string;
  value: number | string;
  onChange: (value: string) => void;
  type?: 'number' | 'text';
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}

function InputWithTooltip({ label, tooltip, value, onChange, type = 'number', suffix, min, max, step }: InputWithTooltipProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm">{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="relative">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className={suffix ? 'pr-12' : ''}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function FormulaSettingsPage() {
  const { data: settings, isLoading } = useFormulaSettings();
  const updateSettings = useUpdateFormulaSettings();
  const defaults = useDefaultFormulaSettings();
  const { activeTenant, isOwner } = useTenantContext();

  const [formData, setFormData] = useState<Partial<FormulaSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
    }
  }, [settings]);

  const updateField = <K extends keyof FormulaSettings>(key: K, value: FormulaSettings[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateCommissionRate = (channel: string, rate: number) => {
    setFormData((prev) => ({
      ...prev,
      channel_commission_rates: {
        ...(prev.channel_commission_rates || {}),
        [channel]: rate,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!isOwner) {
      toast.error('Chỉ chủ sở hữu mới có thể thay đổi cài đặt');
      return;
    }
    updateSettings.mutate(formData);
    setHasChanges(false);
  };

  const handleReset = () => {
    setFormData({
      ...defaults,
      tenant_id: settings?.tenant_id || '',
      id: settings?.id || '',
    });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Chưa có công ty nào được chọn</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Cài đặt Công thức | Bluecore Finance</title>
        <meta name="description" content="Cấu hình các tham số công thức tài chính theo doanh nghiệp" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Cài đặt Công thức</h1>
              <p className="text-muted-foreground">Formula Settings cho {activeTenant.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                Chưa lưu
              </Badge>
            )}
            <Button variant="outline" onClick={handleReset} disabled={updateSettings.isPending}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Đặt lại mặc định
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || updateSettings.isPending || !isOwner}>
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Lưu thay đổi
            </Button>
          </div>
        </motion.div>

        {!isOwner && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-amber-600">
            <p className="text-sm">Chỉ chủ sở hữu công ty mới có thể thay đổi cài đặt công thức.</p>
          </div>
        )}

        <div className="grid gap-6">
          {/* Financial Period */}
          <SettingsSection
            title="Chu kỳ Tài chính"
            description="Cấu hình năm tài chính và số ngày tính toán"
            icon={<Calendar className="w-5 h-5 text-primary" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Số ngày trong năm tài chính</Label>
                <Select
                  value={String(formData.fiscal_year_days || 365)}
                  onValueChange={(v) => updateField('fiscal_year_days', Number(v))}
                  disabled={!isOwner}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="360">360 ngày (Banking convention)</SelectItem>
                    <SelectItem value="365">365 ngày (Calendar year)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tháng bắt đầu năm tài chính</Label>
                <Select
                  value={String(formData.fiscal_year_start_month || 1)}
                  onValueChange={(v) => updateField('fiscal_year_start_month', Number(v))}
                  disabled={!isOwner}
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
          </SettingsSection>

          {/* Working Capital Parameters */}
          <SettingsSection
            title="Tham số Vốn lưu động"
            description="DSO, DIO, DPO và các chỉ số working capital"
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputWithTooltip
                label="DSO - Số ngày tính"
                tooltip="Số ngày dùng để tính Days Sales Outstanding (365 hoặc 360)"
                value={formData.dso_calculation_days || 365}
                onChange={(v) => updateField('dso_calculation_days', Number(v))}
                suffix="ngày"
                min={360}
                max={365}
              />
              <InputWithTooltip
                label="DIO - Số ngày tính"
                tooltip="Số ngày dùng để tính Days Inventory Outstanding"
                value={formData.dio_calculation_days || 365}
                onChange={(v) => updateField('dio_calculation_days', Number(v))}
                suffix="ngày"
                min={360}
                max={365}
              />
              <InputWithTooltip
                label="DPO - Số ngày tính"
                tooltip="Số ngày dùng để tính Days Payables Outstanding"
                value={formData.dpo_calculation_days || 365}
                onChange={(v) => updateField('dpo_calculation_days', Number(v))}
                suffix="ngày"
                min={360}
                max={365}
              />
            </div>
          </SettingsSection>

          {/* AR Aging Buckets */}
          <SettingsSection
            title="AR Aging Buckets"
            description="Cấu hình các ngưỡng phân loại tuổi nợ phải thu"
            icon={<Clock className="w-5 h-5 text-primary" />}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputWithTooltip
                label="Bucket 1"
                tooltip="Ngưỡng đầu tiên phân loại AR (thường là 30 ngày)"
                value={formData.ar_bucket_1 || 30}
                onChange={(v) => updateField('ar_bucket_1', Number(v))}
                suffix="ngày"
                min={1}
                max={90}
              />
              <InputWithTooltip
                label="Bucket 2"
                tooltip="Ngưỡng thứ hai (thường là 60 ngày)"
                value={formData.ar_bucket_2 || 60}
                onChange={(v) => updateField('ar_bucket_2', Number(v))}
                suffix="ngày"
                min={30}
                max={120}
              />
              <InputWithTooltip
                label="Bucket 3"
                tooltip="Ngưỡng thứ ba (thường là 90 ngày)"
                value={formData.ar_bucket_3 || 90}
                onChange={(v) => updateField('ar_bucket_3', Number(v))}
                suffix="ngày"
                min={60}
                max={180}
              />
              <InputWithTooltip
                label="Bucket 4"
                tooltip="Ngưỡng thứ tư (thường là 120 ngày, quá hạn nặng)"
                value={formData.ar_bucket_4 || 120}
                onChange={(v) => updateField('ar_bucket_4', Number(v))}
                suffix="ngày"
                min={90}
                max={365}
              />
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Preview:</strong> 0-{formData.ar_bucket_1 || 30} ngày | {formData.ar_bucket_1 || 30}-{formData.ar_bucket_2 || 60} ngày | {formData.ar_bucket_2 || 60}-{formData.ar_bucket_3 || 90} ngày | {formData.ar_bucket_3 || 90}-{formData.ar_bucket_4 || 120} ngày | &gt;{formData.ar_bucket_4 || 120} ngày
              </p>
            </div>
          </SettingsSection>

          {/* Industry Benchmarks */}
          <SettingsSection
            title="Benchmark theo Ngành"
            description="Mục tiêu và chuẩn so sánh cho ngành của bạn"
            icon={<Percent className="w-5 h-5 text-primary" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputWithTooltip
                label="Target Gross Margin"
                tooltip="Tỷ suất lợi nhuận gộp mục tiêu (retail ~25%, SaaS ~70%)"
                value={formData.target_gross_margin || 30}
                onChange={(v) => updateField('target_gross_margin', Number(v))}
                suffix="%"
                min={0}
                max={100}
                step={0.5}
              />
              <InputWithTooltip
                label="Target Net Margin"
                tooltip="Tỷ suất lợi nhuận ròng mục tiêu"
                value={formData.target_net_margin || 10}
                onChange={(v) => updateField('target_net_margin', Number(v))}
                suffix="%"
                min={0}
                max={50}
                step={0.5}
              />
              <InputWithTooltip
                label="Target DSO"
                tooltip="Số ngày thu tiền mục tiêu"
                value={formData.target_dso || 45}
                onChange={(v) => updateField('target_dso', Number(v))}
                suffix="ngày"
                min={0}
                max={180}
              />
              <InputWithTooltip
                label="Target Collection Rate"
                tooltip="Tỷ lệ thu hồi công nợ mục tiêu"
                value={formData.target_collection_rate || 95}
                onChange={(v) => updateField('target_collection_rate', Number(v))}
                suffix="%"
                min={0}
                max={100}
                step={0.5}
              />
            </div>
          </SettingsSection>

          {/* Cash Management */}
          <SettingsSection
            title="Quản lý Tiền mặt"
            description="Cash runway và dự trữ tiền mặt"
            icon={<Wallet className="w-5 h-5 text-primary" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputWithTooltip
                label="Min Cash Runway"
                tooltip="Số tháng tối thiểu phải có tiền để hoạt động (cảnh báo đỏ)"
                value={formData.min_cash_runway_months || 3}
                onChange={(v) => updateField('min_cash_runway_months', Number(v))}
                suffix="tháng"
                min={1}
                max={24}
              />
              <InputWithTooltip
                label="Safe Cash Runway"
                tooltip="Số tháng an toàn (startup nên có 12-18 tháng)"
                value={formData.safe_cash_runway_months || 6}
                onChange={(v) => updateField('safe_cash_runway_months', Number(v))}
                suffix="tháng"
                min={3}
                max={36}
              />
              <InputWithTooltip
                label="Cash Reserve %"
                tooltip="Tỷ lệ dự trữ tiền mặt so với doanh thu hàng tháng"
                value={formData.cash_reserve_percentage || 20}
                onChange={(v) => updateField('cash_reserve_percentage', Number(v))}
                suffix="%"
                min={0}
                max={100}
                step={1}
              />
            </div>
          </SettingsSection>

          {/* Channel Commission Rates */}
          <SettingsSection
            title="Phí Commission theo Kênh"
            description="Tỷ lệ hoa hồng/phí cho từng kênh bán hàng"
            icon={<ShoppingCart className="w-5 h-5 text-primary" />}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(formData.channel_commission_rates || {}).map(([channel, rate]) => (
                <InputWithTooltip
                  key={channel}
                  label={channel.charAt(0).toUpperCase() + channel.slice(1)}
                  tooltip={`Phí commission cho kênh ${channel}`}
                  value={rate}
                  onChange={(v) => updateCommissionRate(channel, Number(v))}
                  suffix="%"
                  min={0}
                  max={50}
                  step={0.5}
                />
              ))}
            </div>
          </SettingsSection>

          {/* Forecasting Parameters */}
          <SettingsSection
            title="Tham số Dự báo"
            description="Confidence level và tỷ lệ tăng trưởng mặc định"
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputWithTooltip
                label="Confidence Level"
                tooltip="Mức độ tin cậy cho dự báo (95% là phổ biến)"
                value={formData.forecast_confidence_level || 95}
                onChange={(v) => updateField('forecast_confidence_level', Number(v))}
                suffix="%"
                min={80}
                max={99}
                step={1}
              />
              <InputWithTooltip
                label="Default Growth Rate"
                tooltip="Tỷ lệ tăng trưởng mặc định cho dự báo"
                value={formData.forecast_default_growth_rate || 5}
                onChange={(v) => updateField('forecast_default_growth_rate', Number(v))}
                suffix="%"
                min={-50}
                max={100}
                step={0.5}
              />
              <InputWithTooltip
                label="Collection Rate"
                tooltip="Tỷ lệ thu tiền dự kiến cho dự báo dòng tiền"
                value={formData.forecast_collection_rate || 85}
                onChange={(v) => updateField('forecast_collection_rate', Number(v))}
                suffix="%"
                min={0}
                max={100}
                step={1}
              />
            </div>
          </SettingsSection>

          {/* Cash Flow Direct Parameters */}
          <SettingsSection
            title="Dòng tiền Trực tiếp"
            description="Tham số cho báo cáo và phân tích dòng tiền trực tiếp"
            icon={<Banknote className="w-5 h-5 text-primary" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputWithTooltip
                label="Operating Cash Ratio Target"
                tooltip="Tỷ lệ dòng tiền hoạt động mục tiêu (≥1.0 là lành mạnh)"
                value={formData.operating_cash_ratio_target || 1.0}
                onChange={(v) => updateField('operating_cash_ratio_target', Number(v))}
                min={0.5}
                max={3}
                step={0.1}
              />
              <InputWithTooltip
                label="Burn Rate Warning"
                tooltip="Tỷ lệ burn rate cảnh báo (% doanh thu)"
                value={formData.cash_burn_rate_warning || 15}
                onChange={(v) => updateField('cash_burn_rate_warning', Number(v))}
                suffix="%"
                min={5}
                max={50}
              />
              <InputWithTooltip
                label="Burn Rate Critical"
                tooltip="Tỷ lệ burn rate nghiêm trọng (% doanh thu)"
                value={formData.cash_burn_rate_critical || 25}
                onChange={(v) => updateField('cash_burn_rate_critical', Number(v))}
                suffix="%"
                min={10}
                max={80}
              />
              <InputWithTooltip
                label="Minimum Operating Cash"
                tooltip="Số tiền tối thiểu cần giữ cho hoạt động"
                value={formData.minimum_operating_cash || 500000000}
                onChange={(v) => updateField('minimum_operating_cash', Number(v))}
                suffix="VND"
                min={0}
                step={100000000}
              />
              <InputWithTooltip
                label="Investing Budget %"
                tooltip="Tỷ lệ ngân sách cho hoạt động đầu tư"
                value={formData.investing_budget_percentage || 10}
                onChange={(v) => updateField('investing_budget_percentage', Number(v))}
                suffix="%"
                min={0}
                max={50}
              />
              <InputWithTooltip
                label="Max Debt Ratio"
                tooltip="Tỷ lệ nợ tối đa cho hoạt động tài chính"
                value={formData.financing_debt_ratio_max || 60}
                onChange={(v) => updateField('financing_debt_ratio_max', Number(v))}
                suffix="%"
                min={0}
                max={100}
              />
            </div>
          </SettingsSection>

          {/* Inventory Aging Parameters */}
          <SettingsSection
            title="Tuổi tồn kho"
            description="Tham số phân tích và quản lý tồn kho"
            icon={<Package className="w-5 h-5 text-primary" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputWithTooltip
                label="Slow Moving Days"
                tooltip="Số ngày xác định hàng tồn chậm luân chuyển"
                value={formData.inventory_slow_moving_days || 90}
                onChange={(v) => updateField('inventory_slow_moving_days', Number(v))}
                suffix="ngày"
                min={30}
                max={180}
              />
              <InputWithTooltip
                label="Dead Stock Days"
                tooltip="Số ngày xác định hàng tồn không luân chuyển"
                value={formData.inventory_dead_stock_days || 180}
                onChange={(v) => updateField('inventory_dead_stock_days', Number(v))}
                suffix="ngày"
                min={60}
                max={365}
              />
              <InputWithTooltip
                label="Target Turnover"
                tooltip="Vòng quay tồn kho mục tiêu (lần/năm)"
                value={formData.inventory_target_turnover || 6}
                onChange={(v) => updateField('inventory_target_turnover', Number(v))}
                suffix="lần"
                min={1}
                max={24}
              />
              <InputWithTooltip
                label="Holding Cost Rate"
                tooltip="Chi phí lưu kho hàng năm (% giá trị)"
                value={formData.inventory_holding_cost_rate || 25}
                onChange={(v) => updateField('inventory_holding_cost_rate', Number(v))}
                suffix="%"
                min={5}
                max={50}
              />
            </div>
          </SettingsSection>

          {/* Promotion ROI Parameters */}
          <SettingsSection
            title="ROI Khuyến mãi"
            description="Tham số đánh giá hiệu quả chương trình khuyến mãi"
            icon={<Tag className="w-5 h-5 text-primary" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputWithTooltip
                label="Min ROI"
                tooltip="ROI tối thiểu chấp nhận được cho khuyến mãi"
                value={formData.promotion_min_roi || 200}
                onChange={(v) => updateField('promotion_min_roi', Number(v))}
                suffix="%"
                min={50}
                max={500}
              />
              <InputWithTooltip
                label="Target ROAS"
                tooltip="Return on Ad Spend mục tiêu (VD: 4 = 4đ revenue/1đ chi)"
                value={formData.promotion_target_roas || 4}
                onChange={(v) => updateField('promotion_target_roas', Number(v))}
                suffix="x"
                min={1}
                max={20}
                step={0.5}
              />
              <InputWithTooltip
                label="Max Discount Rate"
                tooltip="Tỷ lệ giảm giá tối đa cho phép"
                value={formData.promotion_max_discount_rate || 50}
                onChange={(v) => updateField('promotion_max_discount_rate', Number(v))}
                suffix="%"
                min={10}
                max={90}
              />
            </div>
          </SettingsSection>

          {/* Supplier Payment Parameters */}
          <SettingsSection
            title="Thanh toán Nhà cung cấp"
            description="Tham số quản lý thanh toán và quan hệ NCC"
            icon={<Truck className="w-5 h-5 text-primary" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputWithTooltip
                label="Early Payment Threshold"
                tooltip="Ngưỡng chiết khấu thanh toán sớm có lợi (% APR)"
                value={formData.supplier_early_payment_threshold || 2}
                onChange={(v) => updateField('supplier_early_payment_threshold', Number(v))}
                suffix="%"
                min={0.5}
                max={10}
                step={0.5}
              />
              <InputWithTooltip
                label="Concentration Warning"
                tooltip="Cảnh báo khi 1 NCC chiếm % mua hàng"
                value={formData.supplier_concentration_warning || 30}
                onChange={(v) => updateField('supplier_concentration_warning', Number(v))}
                suffix="%"
                min={10}
                max={60}
              />
              <InputWithTooltip
                label="Payment Compliance Target"
                tooltip="Tỷ lệ thanh toán đúng hạn mục tiêu"
                value={formData.supplier_payment_compliance_target || 95}
                onChange={(v) => updateField('supplier_payment_compliance_target', Number(v))}
                suffix="%"
                min={80}
                max={100}
              />
            </div>
          </SettingsSection>

          {/* Payment Terms & Tax */}
          <SettingsSection
            title="Payment Terms & Thuế"
            description="Điều khoản thanh toán và thuế suất mặc định"
            icon={<FileText className="w-5 h-5 text-primary" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputWithTooltip
                label="Payment Terms (AR)"
                tooltip="Số ngày thanh toán mặc định cho khách hàng"
                value={formData.default_payment_terms_ar || 30}
                onChange={(v) => updateField('default_payment_terms_ar', Number(v))}
                suffix="ngày"
                min={0}
                max={180}
              />
              <InputWithTooltip
                label="Payment Terms (AP)"
                tooltip="Số ngày thanh toán mặc định cho nhà cung cấp"
                value={formData.default_payment_terms_ap || 30}
                onChange={(v) => updateField('default_payment_terms_ap', Number(v))}
                suffix="ngày"
                min={0}
                max={180}
              />
              <InputWithTooltip
                label="VAT Rate"
                tooltip="Thuế GTGT mặc định"
                value={formData.vat_rate || 10}
                onChange={(v) => updateField('vat_rate', Number(v))}
                suffix="%"
                min={0}
                max={25}
                step={0.5}
              />
              <InputWithTooltip
                label="Corporate Tax Rate"
                tooltip="Thuế thu nhập doanh nghiệp"
                value={formData.corporate_tax_rate || 20}
                onChange={(v) => updateField('corporate_tax_rate', Number(v))}
                suffix="%"
                min={0}
                max={35}
                step={0.5}
              />
            </div>
          </SettingsSection>
        </div>
      </div>
    </>
  );
}
