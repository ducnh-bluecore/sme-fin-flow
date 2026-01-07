import { useState, useMemo } from 'react';
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  Package,
  Wallet,
  BarChart3,
  Settings2,
  Store,
  Loader2,
  Database,
  Save,
  FolderOpen,
  Star,
  Trash2,
  Check,
  Boxes,
  MapPin,
  History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatVNDCompact } from '@/lib/formatters';
import { useKPIData } from '@/hooks/useKPIData';
import { useWhatIfDefaults } from '@/hooks/useWhatIfDefaults';
import { useWhatIfRealData } from '@/hooks/useWhatIfRealData';
import { 
  useWhatIfScenarios, 
  useSaveWhatIfScenario, 
  useDeleteWhatIfScenario, 
  useUpdateWhatIfScenario,
  WhatIfParams,
  WhatIfResults,
} from '@/hooks/useWhatIfScenarios';
import { MonthlyProfitTrendChart } from './MonthlyProfitTrendChart';
import { WhatIfChatbot } from './WhatIfChatbot';
import { NoDataOverlay, SIMPLE_SIMULATION_REQUIREMENTS } from './NoDataOverlay';
import { RetailScenarioPanel } from './RetailScenarioPanel';
import { SKUProfitabilityPanel } from './SKUProfitabilityPanel';
import { GeographicAnalysisPanel } from './GeographicAnalysisPanel';
import { HistoricalComparisonPanel } from './HistoricalComparisonPanel';

interface SimulationParams {
  revenueChange: number;
  cogsChange: number;
  opexChange: number;
  priceChange: number;
  volumeChange: number;
}

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  icon?: React.ReactNode;
  description?: string;
}

function SliderInput({
  label,
  value,
  onChange,
  min = -50,
  max = 50,
  step = 1,
  unit = '%',
  icon,
  description,
}: SliderInputProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div className="space-y-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <Label className="text-sm font-medium">{label}</Label>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'min-w-[60px] justify-center',
              isPositive && 'border-success/50 text-success bg-success/10',
              isNegative && 'border-destructive/50 text-destructive bg-destructive/10',
              !isPositive && !isNegative && 'border-border'
            )}
          >
            {isPositive ? '+' : ''}{value}{unit}
          </Badge>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        min={min}
        max={max}
        step={step}
        className="py-1"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export function WhatIfSimulationPanel() {
  const { data: kpiData, isLoading: kpiLoading } = useKPIData();
  const { data: defaults, isLoading: defaultsLoading } = useWhatIfDefaults();
  const { data: realData, isLoading: realLoading } = useWhatIfRealData();
  const { data: savedScenarios = [], isLoading: scenariosLoading } = useWhatIfScenarios();
  const saveScenario = useSaveWhatIfScenario();
  const deleteScenario = useDeleteWhatIfScenario();
  const updateScenario = useUpdateWhatIfScenario();
  
  const [mode, setMode] = useState<'simple' | 'retail' | 'sku' | 'geo' | 'history'>('simple');
  const [params, setParams] = useState<SimulationParams>({
    revenueChange: 0,
    cogsChange: 0,
    opexChange: 0,
    priceChange: 0,
    volumeChange: 0,
  });
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  // Base values (prefer KPI cache; fallback to real orders data if KPI cache isn't built yet)
  const baseValues = useMemo(() => {
    const kpiHasRevenue = (kpiData?.totalRevenue || 0) > 0;
    const sourceRevenue = kpiHasRevenue ? (kpiData?.totalRevenue || 0) : (realData?.totalRevenue || 0);

    // Prefer KPI gross margin when available; otherwise compute from order data
    const sourceGrossMargin = kpiHasRevenue
      ? (kpiData?.grossMargin || 35)
      : (sourceRevenue > 0
          ? (((sourceRevenue - (realData?.totalCogs || 0)) / sourceRevenue) * 100)
          : 0);

    const cogs = kpiHasRevenue
      ? sourceRevenue * (1 - sourceGrossMargin / 100)
      : (realData?.totalCogs || 0);

    // For demo / order-based fallback: approximate EBITDA with net profit
    const ebitda = kpiHasRevenue ? (kpiData?.ebitda || 0) : (realData?.totalNetProfit || 0);

    // Estimate OPEX: EBITDA = (Revenue - COGS - Fees) - OPEX
    const fees = kpiHasRevenue ? 0 : (realData?.totalFees || 0);
    const grossProfitAfterFees = sourceRevenue - cogs - fees;
    const opex = grossProfitAfterFees - ebitda;

    return {
      revenue: sourceRevenue,
      cogs,
      opex: opex > 0 ? opex : sourceRevenue * 0.25,
      ebitda,
      grossMargin: sourceGrossMargin,
    };
  }, [kpiData, realData]);

  // Calculate projected values
  const projectedValues = useMemo(() => {
    const revenueMultiplier = 1 + params.revenueChange / 100;
    const cogsMultiplier = 1 + params.cogsChange / 100;
    const opexMultiplier = 1 + params.opexChange / 100;

    const projectedRevenue = baseValues.revenue * revenueMultiplier;
    const projectedCogs = baseValues.cogs * cogsMultiplier;
    const projectedOpex = baseValues.opex * opexMultiplier;
    const projectedGrossProfit = projectedRevenue - projectedCogs;
    const projectedEbitda = projectedGrossProfit - projectedOpex;
    const projectedGrossMargin = projectedRevenue > 0 
      ? (projectedGrossProfit / projectedRevenue) * 100 
      : 0;

    return {
      revenue: projectedRevenue,
      cogs: projectedCogs,
      opex: projectedOpex,
      ebitda: projectedEbitda,
      grossMargin: projectedGrossMargin,
      revenueChange: ((projectedRevenue / baseValues.revenue) - 1) * 100,
      ebitdaChange: baseValues.ebitda !== 0 
        ? ((projectedEbitda / baseValues.ebitda) - 1) * 100 
        : projectedEbitda > 0 ? 100 : -100,
      grossMarginChange: projectedGrossMargin - baseValues.grossMargin,
    };
  }, [baseValues, params]);

  const updateParam = (key: keyof SimulationParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
    setSelectedScenarioId(null); // Clear selection when params change
  };

  // Handle saving a new scenario
  const handleSaveScenario = () => {
    if (!scenarioName.trim()) return;
    
    const whatIfParams: WhatIfParams = {
      revenueChange: params.revenueChange,
      cogsChange: params.cogsChange,
      opexChange: params.opexChange,
      arDaysChange: 0,
      apDaysChange: 0,
      priceChange: params.priceChange,
      volumeChange: params.volumeChange,
    };
    
    const whatIfResults: WhatIfResults = {
      revenue: projectedValues.revenue,
      revenueChange: projectedValues.revenueChange,
      ebitda: projectedValues.ebitda,
      ebitdaChange: projectedValues.ebitdaChange,
      grossMargin: projectedValues.grossMargin,
      marginChange: projectedValues.grossMarginChange,
      projectedCash: 0,
      cashChange: 0,
    };
    
    saveScenario.mutate({
      name: scenarioName,
      params: whatIfParams,
      results: whatIfResults,
      control_mode: 'simple',
    }, {
      onSuccess: () => {
        setIsSaveDialogOpen(false);
        setScenarioName('');
      },
    });
  };

  // Handle loading a saved scenario
  const handleLoadScenario = (scenario: typeof savedScenarios[0]) => {
    setParams({
      revenueChange: scenario.params.revenueChange || 0,
      cogsChange: scenario.params.cogsChange || 0,
      opexChange: scenario.params.opexChange || 0,
      priceChange: scenario.params.priceChange || 0,
      volumeChange: scenario.params.volumeChange || 0,
    });
    setSelectedScenarioId(scenario.id);
  };

  // Handle deleting a scenario
  const handleDeleteScenario = (id: string) => {
    deleteScenario.mutate(id);
    if (selectedScenarioId === id) {
      setSelectedScenarioId(null);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (scenario: typeof savedScenarios[0]) => {
    updateScenario.mutate({
      id: scenario.id,
      updates: { is_favorite: !scenario.is_favorite },
    });
  };

  const hasData = useMemo(() => baseValues.revenue > 0, [baseValues.revenue]);

  const isLoading = kpiLoading || defaultsLoading || realLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const dataRequirements = SIMPLE_SIMULATION_REQUIREMENTS({
    hasRevenue: baseValues.revenue > 0,
    hasCOGS: baseValues.cogs > 0,
    hasOPEX: baseValues.opex > 0,
    // Simple mode doesn't actually use cash for calculations; allow demo simulation when revenue exists
    hasCash: (kpiData?.cashToday || 0) > 0 || baseValues.revenue > 0,
  });

  return (
    <div className="space-y-6 relative">
      {/* Mode Selector */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'simple' | 'retail')}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {mode === 'simple' ? (
                <FlaskConical className="w-5 h-5 text-primary" />
              ) : (
                <Store className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">Mô phỏng What-If</h3>
              <p className="text-xs text-muted-foreground">
                {selectedScenarioId 
                  ? `Đang xem: ${savedScenarios.find(s => s.id === selectedScenarioId)?.name || 'Kịch bản đã lưu'}`
                  : 'Điều chỉnh các tham số để xem tác động'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Load Scenarios Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Kịch bản đã lưu
                  {savedScenarios.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{savedScenarios.length}</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {savedScenarios.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Chưa có kịch bản nào được lưu
                  </div>
                ) : (
                  <>
                    {savedScenarios
                      .filter(s => s.is_favorite)
                      .map(scenario => (
                        <DropdownMenuItem 
                          key={scenario.id} 
                          className="flex items-center justify-between gap-2 cursor-pointer"
                          onClick={() => handleLoadScenario(scenario)}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Star className="w-4 h-4 text-warning fill-warning shrink-0" />
                            <span className="truncate">{scenario.name}</span>
                            {selectedScenarioId === scenario.id && (
                              <Check className="w-4 h-4 text-success shrink-0" />
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScenario(scenario.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </DropdownMenuItem>
                      ))}
                    {savedScenarios.filter(s => s.is_favorite).length > 0 && 
                     savedScenarios.filter(s => !s.is_favorite).length > 0 && (
                      <DropdownMenuSeparator />
                    )}
                    {savedScenarios
                      .filter(s => !s.is_favorite)
                      .map(scenario => (
                        <DropdownMenuItem 
                          key={scenario.id} 
                          className="flex items-center justify-between gap-2 cursor-pointer"
                          onClick={() => handleLoadScenario(scenario)}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(scenario);
                              }}
                            >
                              <Star className="w-3 h-3" />
                            </Button>
                            <span className="truncate">{scenario.name}</span>
                            {selectedScenarioId === scenario.id && (
                              <Check className="w-4 h-4 text-success shrink-0" />
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScenario(scenario.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </DropdownMenuItem>
                      ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Save Scenario Dialog */}
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Save className="w-4 h-4" />
                  Lưu kịch bản
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Lưu kịch bản What-If</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tên kịch bản</Label>
                    <Input
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                      placeholder="VD: Tăng doanh thu 20%..."
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                    <p className="font-medium">Tham số hiện tại:</p>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                      <div>Doanh thu: <span className="text-foreground">{params.revenueChange >= 0 ? '+' : ''}{params.revenueChange}%</span></div>
                      <div>Giá vốn: <span className="text-foreground">{params.cogsChange >= 0 ? '+' : ''}{params.cogsChange}%</span></div>
                      <div>Chi phí: <span className="text-foreground">{params.opexChange >= 0 ? '+' : ''}{params.opexChange}%</span></div>
                      <div>EBITDA: <span className="text-foreground font-medium">{formatVNDCompact(projectedValues.ebitda)}</span></div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleSaveScenario} 
                    disabled={!scenarioName.trim() || saveScenario.isPending}
                  >
                    {saveScenario.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Lưu
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid grid-cols-5 w-auto">
            <TabsTrigger value="simple" className="text-xs px-3">
              <Settings2 className="w-3 h-3 mr-1" />
              Cơ bản
            </TabsTrigger>
            <TabsTrigger value="retail" className="text-xs px-3">
              <Store className="w-3 h-3 mr-1" />
              Bán lẻ
            </TabsTrigger>
            <TabsTrigger value="sku" className="text-xs px-3">
              <Boxes className="w-3 h-3 mr-1" />
              SKU
            </TabsTrigger>
            <TabsTrigger value="geo" className="text-xs px-3">
              <MapPin className="w-3 h-3 mr-1" />
              Vùng miền
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs px-3">
              <History className="w-3 h-3 mr-1" />
              So sánh
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Simple Mode Content */}
        <TabsContent value="simple" className="mt-0 space-y-6">
          {/* No Data Overlay */}
          {!hasData && (
            <NoDataOverlay requirements={dataRequirements} />
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Doanh thu</p>
                <p className="text-lg font-bold">{formatVNDCompact(projectedValues.revenue)}</p>
              </div>
              {projectedValues.revenueChange !== 0 && (
                <Badge 
                  variant="outline"
                  className={cn(
                    projectedValues.revenueChange > 0 
                      ? 'text-success border-success/30 bg-success/10' 
                      : 'text-destructive border-destructive/30 bg-destructive/10'
                  )}
                >
                  {projectedValues.revenueChange > 0 ? '+' : ''}
                  {projectedValues.revenueChange.toFixed(1)}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">EBITDA</p>
                <p className="text-lg font-bold">{formatVNDCompact(projectedValues.ebitda)}</p>
              </div>
              {projectedValues.ebitdaChange !== 0 && isFinite(projectedValues.ebitdaChange) && (
                <Badge 
                  variant="outline"
                  className={cn(
                    projectedValues.ebitdaChange > 0 
                      ? 'text-success border-success/30 bg-success/10' 
                      : 'text-destructive border-destructive/30 bg-destructive/10'
                  )}
                >
                  {projectedValues.ebitdaChange > 0 ? '+' : ''}
                  {projectedValues.ebitdaChange.toFixed(1)}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Gross Margin</p>
                <p className="text-lg font-bold">{projectedValues.grossMargin.toFixed(1)}%</p>
              </div>
              {projectedValues.grossMarginChange !== 0 && (
                <Badge 
                  variant="outline"
                  className={cn(
                    projectedValues.grossMarginChange > 0 
                      ? 'text-success border-success/30 bg-success/10' 
                      : 'text-destructive border-destructive/30 bg-destructive/10'
                  )}
                >
                  {projectedValues.grossMarginChange > 0 ? '+' : ''}
                  {projectedValues.grossMarginChange.toFixed(1)}pp
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          projectedValues.ebitda > baseValues.ebitda 
            ? 'bg-success/5 border-success/20' 
            : projectedValues.ebitda < baseValues.ebitda 
              ? 'bg-destructive/5 border-destructive/20' 
              : ''
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Thay đổi LN</p>
                <p className="text-lg font-bold">
                  {formatVNDCompact(projectedValues.ebitda - baseValues.ebitda)}
                </p>
              </div>
              {projectedValues.ebitda > baseValues.ebitda ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : projectedValues.ebitda < baseValues.ebitda ? (
                <TrendingDown className="w-5 h-5 text-destructive" />
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parameter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Doanh thu & Chi phí
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SliderInput
              label="Thay đổi doanh thu"
              value={params.revenueChange}
              onChange={(v) => updateParam('revenueChange', v)}
              min={-50}
              max={100}
              icon={<TrendingUp className="w-4 h-4 text-primary" />}
              description="Tăng/giảm doanh thu so với hiện tại"
            />
            
            <Separator />
            
            <SliderInput
              label="Thay đổi giá vốn (COGS)"
              value={params.cogsChange}
              onChange={(v) => updateParam('cogsChange', v)}
              min={-30}
              max={50}
              icon={<Package className="w-4 h-4 text-warning" />}
              description="Chi phí hàng bán"
            />
            
            <Separator />
            
            <SliderInput
              label="Thay đổi chi phí (OPEX)"
              value={params.opexChange}
              onChange={(v) => updateParam('opexChange', v)}
              min={-30}
              max={50}
              icon={<Wallet className="w-4 h-4 text-destructive" />}
              description="Chi phí vận hành"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Giá & Sản lượng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SliderInput
              label="Thay đổi giá bán"
              value={params.priceChange}
              onChange={(v) => updateParam('priceChange', v)}
              min={-30}
              max={50}
              icon={<Percent className="w-4 h-4 text-success" />}
              description="Tăng/giảm giá bán trung bình"
            />
            
            <Separator />
            
            <SliderInput
              label="Thay đổi sản lượng"
              value={params.volumeChange}
              onChange={(v) => updateParam('volumeChange', v)}
              min={-50}
              max={100}
              icon={<Package className="w-4 h-4 text-primary" />}
              description="Số lượng sản phẩm bán ra"
            />
            
            {/* Info Panel */}
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Dữ liệu cơ sở</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span>Doanh thu: </span>
                      <span className="font-medium text-foreground">
                        {formatVNDCompact(baseValues.revenue)}
                      </span>
                    </div>
                    <div>
                      <span>EBITDA: </span>
                      <span className="font-medium text-foreground">
                        {formatVNDCompact(baseValues.ebitda)}
                      </span>
                    </div>
                    <div>
                      <span>Giá vốn: </span>
                      <span className="font-medium text-foreground">
                        {formatVNDCompact(baseValues.cogs)}
                      </span>
                    </div>
                    <div>
                      <span>Chi phí: </span>
                      <span className="font-medium text-foreground">
                        {formatVNDCompact(baseValues.opex)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      {hasData && (
        <MonthlyProfitTrendChart
          baseValues={{
            revenue: baseValues.revenue,
            cogs: baseValues.cogs,
            opex: baseValues.opex,
            ebitda: baseValues.ebitda,
            grossMargin: baseValues.grossMargin,
          }}
          projectedValues={{
            revenue: projectedValues.revenue,
            cogs: projectedValues.cogs,
            opex: projectedValues.opex,
            ebitda: projectedValues.ebitda,
            grossMargin: projectedValues.grossMargin,
            revenueChange: projectedValues.revenueChange,
            ebitdaChange: projectedValues.ebitdaChange,
          }}
          controlMode="simple"
        />
      )}

          {/* AI Chatbot */}
          <WhatIfChatbot
            scenarioContext={{
              currentParams: params,
              results: projectedValues,
            }}
          />
        </TabsContent>

        {/* Retail Mode Content */}
        <TabsContent value="retail" className="mt-0">
          <RetailScenarioPanel />
        </TabsContent>

        {/* SKU Profitability Mode */}
        <TabsContent value="sku" className="mt-0">
          <SKUProfitabilityPanel />
        </TabsContent>

        {/* Geographic Analysis Mode */}
        <TabsContent value="geo" className="mt-0">
          <GeographicAnalysisPanel />
        </TabsContent>

        {/* Historical Comparison Mode */}
        <TabsContent value="history" className="mt-0">
          <HistoricalComparisonPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
