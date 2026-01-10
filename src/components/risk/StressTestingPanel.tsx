import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, Play, Plus, Trash2, AlertTriangle, TrendingDown, 
  BarChart3, Percent, DollarSign, RefreshCw, Save, Loader2, Info, HelpCircle
} from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { formatVNDCompact, formatPercent, formatCount } from '@/lib/formatters';
import { 
  useMonteCarloSimulation, 
  ScenarioConfig, 
  runMonteCarloSimulation 
} from '@/hooks/useMonteCarloSimulation';
import { useDashboardKPICache } from '@/hooks/useDashboardCache';
import { useCashRunway } from '@/hooks/useCashRunway';
import { useSaveMonteCarloResult } from '@/hooks/useMonteCarloData';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_SCENARIOS: ScenarioConfig[] = [
  {
    id: '1',
    name: 'Mất top 1 khách hàng',
    type: 'customer_loss',
    impactPercent: -25,
    probability: 0.1,
    volatility: 5,
    isEnabled: true,
  },
  {
    id: '2',
    name: 'Tăng lãi suất +2%',
    type: 'interest_rate',
    impactPercent: -8,
    probability: 0.3,
    volatility: 2,
    isEnabled: true,
  },
  {
    id: '3',
    name: 'Supplier ngừng cung cấp',
    type: 'cost_increase',
    impactPercent: -15,
    probability: 0.05,
    volatility: 3,
    isEnabled: true,
  },
  {
    id: '4',
    name: 'VND mất giá 5%',
    type: 'fx_rate',
    impactPercent: -5,
    probability: 0.4,
    volatility: 2,
    isEnabled: true,
  },
  {
    id: '5',
    name: 'Doanh thu giảm 20%',
    type: 'revenue_drop',
    impactPercent: -20,
    probability: 0.15,
    volatility: 5,
    isEnabled: false,
  },
];

const SCENARIO_TYPES = [
  { value: 'revenue_drop', label: 'Giảm doanh thu' },
  { value: 'cost_increase', label: 'Tăng chi phí' },
  { value: 'customer_loss', label: 'Mất khách hàng' },
  { value: 'interest_rate', label: 'Lãi suất' },
  { value: 'fx_rate', label: 'Tỷ giá' },
  { value: 'custom', label: 'Tùy chỉnh' },
];

export function StressTestingPanel() {
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>(DEFAULT_SCENARIOS);
  const [iterations, setIterations] = useState(10000);
  const [activeTab, setActiveTab] = useState('scenarios');
  const [newScenario, setNewScenario] = useState<Partial<ScenarioConfig>>({
    name: '',
    type: 'custom',
    impactPercent: -10,
    probability: 0.2,
    volatility: 3,
    isEnabled: true,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { isRunning, output, runSimulation, reset } = useMonteCarloSimulation();
  const { data: kpiData } = useDashboardKPICache();
  const { data: cashRunway } = useCashRunway();
  const saveResult = useSaveMonteCarloResult();
  const { user } = useAuth();

  // Get base value from real data
  const baseValue = useMemo(() => {
    // Use EBITDA or cash as base, or fallback
    if (kpiData?.ebitda) return kpiData.ebitda;
    if (cashRunway?.currentCash) return cashRunway.currentCash;
    return 50000000000; // 50 tỷ default
  }, [kpiData, cashRunway]);

  const handleToggleScenario = (id: string) => {
    setScenarios(prev => prev.map(s => 
      s.id === id ? { ...s, isEnabled: !s.isEnabled } : s
    ));
  };

  const handleUpdateScenario = (id: string, field: keyof ScenarioConfig, value: number) => {
    setScenarios(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleAddScenario = () => {
    if (!newScenario.name) return;
    
    const scenario: ScenarioConfig = {
      id: Date.now().toString(),
      name: newScenario.name || 'Kịch bản mới',
      type: (newScenario.type as ScenarioConfig['type']) || 'custom',
      impactPercent: newScenario.impactPercent || -10,
      probability: newScenario.probability || 0.2,
      volatility: newScenario.volatility || 3,
      isEnabled: true,
    };
    
    setScenarios(prev => [...prev, scenario]);
    setNewScenario({
      name: '',
      type: 'custom',
      impactPercent: -10,
      probability: 0.2,
      volatility: 3,
      isEnabled: true,
    });
    setIsAddDialogOpen(false);
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const handleRunSimulation = () => {
    runSimulation(baseValue, scenarios, iterations);
    setActiveTab('results');
  };

  const handleSaveResult = async () => {
    if (!output) return;
    
    await saveResult.mutateAsync({
      scenario_id: null,
      simulation_count: iterations,
      mean_ebitda: output.results.mean,
      std_dev_ebitda: output.results.stdDev,
      p10_ebitda: output.results.p5,
      p50_ebitda: output.results.median,
      p90_ebitda: output.results.p95,
      min_ebitda: output.results.min,
      max_ebitda: output.results.max,
      distribution_data: {
        distribution: output.results.distribution,
        scenarios: scenarios.filter(s => s.isEnabled),
        baseValue,
        riskMetrics: output.riskMetrics,
      },
      created_by: user?.id || null,
    });
  };

  // Quick calculation for preview
  const previewImpact = useMemo(() => {
    const enabled = scenarios.filter(s => s.isEnabled);
    const expectedImpact = enabled.reduce((acc, s) => 
      acc + (s.impactPercent * s.probability), 0
    );
    return {
      count: enabled.length,
      expectedImpact,
      stressedValue: baseValue * (1 + expectedImpact / 100),
    };
  }, [scenarios, baseValue]);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Stress Testing & Monte Carlo Simulation
            </CardTitle>
            <CardDescription>
              Mô phỏng tác động của các kịch bản rủi ro với {formatCount(iterations)} lần chạy
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-muted-foreground">
              Base: {formatVNDCompact(baseValue)}
            </Badge>
            <Button 
              onClick={handleRunSimulation} 
              disabled={isRunning || previewImpact.count === 0}
              className="gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Chạy mô phỏng
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="scenarios">Kịch bản ({previewImpact.count})</TabsTrigger>
            <TabsTrigger value="results" disabled={!output}>Kết quả</TabsTrigger>
            <TabsTrigger value="distribution" disabled={!output}>Phân phối</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios" className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">Kịch bản đang bật</p>
                <p className="text-2xl font-bold">{previewImpact.count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tác động kỳ vọng</p>
                <p className={`text-2xl font-bold ${previewImpact.expectedImpact < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {previewImpact.expectedImpact.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giá trị dự kiến</p>
                <p className="text-2xl font-bold">{formatVNDCompact(previewImpact.stressedValue)}</p>
              </div>
            </div>

            {/* Scenarios List */}
            <div className="space-y-3">
              <AnimatePresence>
                {scenarios.map((scenario) => (
                  <motion.div
                    key={scenario.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-lg border transition-colors ${
                      scenario.isEnabled ? 'bg-card' : 'bg-muted/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={scenario.isEnabled}
                          onCheckedChange={() => handleToggleScenario(scenario.id)}
                        />
                        <div>
                          <h4 className="font-medium">{scenario.name}</h4>
                          <Badge variant="outline" className="mt-1">
                            {SCENARIO_TYPES.find(t => t.value === scenario.type)?.label}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteScenario(scenario.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {scenario.isEnabled && (
                      <div className="grid grid-cols-3 gap-6 mt-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tác động</span>
                            <span className={scenario.impactPercent < 0 ? 'text-red-500' : 'text-green-500'}>
                              {scenario.impactPercent}%
                            </span>
                          </div>
                          <Slider
                            value={[scenario.impactPercent]}
                            min={-50}
                            max={20}
                            step={1}
                            onValueChange={([v]) => handleUpdateScenario(scenario.id, 'impactPercent', v)}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Xác suất</span>
                            <span>{formatPercent(scenario.probability, true)}</span>
                          </div>
                          <Slider
                            value={[scenario.probability * 100]}
                            min={1}
                            max={100}
                            step={1}
                            onValueChange={([v]) => handleUpdateScenario(scenario.id, 'probability', v / 100)}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Độ biến động</span>
                            <span>±{scenario.volatility}%</span>
                          </div>
                          <Slider
                            value={[scenario.volatility]}
                            min={1}
                            max={15}
                            step={0.5}
                            onValueChange={([v]) => handleUpdateScenario(scenario.id, 'volatility', v)}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Add Scenario Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Thêm kịch bản mới
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm kịch bản rủi ro</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tên kịch bản</Label>
                    <Input
                      value={newScenario.name}
                      onChange={(e) => setNewScenario(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="VD: Mất 20% khách hàng"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại kịch bản</Label>
                    <Select
                      value={newScenario.type}
                      onValueChange={(v) => setNewScenario(prev => ({ ...prev, type: v as ScenarioConfig['type'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCENARIO_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tác động (%)</Label>
                      <Input
                        type="number"
                        value={newScenario.impactPercent}
                        onChange={(e) => setNewScenario(prev => ({ ...prev, impactPercent: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Xác suất (%)</Label>
                      <Input
                        type="number"
                        value={(newScenario.probability || 0) * 100}
                        onChange={(e) => setNewScenario(prev => ({ ...prev, probability: Number(e.target.value) / 100 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Biến động (±%)</Label>
                      <Input
                        type="number"
                        value={newScenario.volatility}
                        onChange={(e) => setNewScenario(prev => ({ ...prev, volatility: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleAddScenario} className="w-full">
                  Thêm kịch bản
                </Button>
              </DialogContent>
            </Dialog>

            {/* Iterations Setting */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Số lần mô phỏng</p>
                <p className="text-sm text-muted-foreground">Nhiều hơn = chính xác hơn nhưng chậm hơn</p>
              </div>
              <Select
                value={iterations.toString()}
                onValueChange={(v) => setIterations(Number(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">1,000</SelectItem>
                  <SelectItem value="5000">5,000</SelectItem>
                  <SelectItem value="10000">10,000</SelectItem>
                  <SelectItem value="50000">50,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="results">
            {output && <SimulationResults output={output} onSave={handleSaveResult} isSaving={saveResult.isPending} />}
          </TabsContent>

          <TabsContent value="distribution">
            {output && <DistributionChart output={output} baseValue={baseValue} />}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Formula explanation component
function FormulaTooltip({ title, formula, explanation }: { title: string; formula: string; explanation: string }) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="top">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{title}</h4>
          <div className="p-2 bg-muted rounded-md font-mono text-xs">
            {formula}
          </div>
          <p className="text-xs text-muted-foreground">{explanation}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function SimulationResults({ 
  output, 
  onSave, 
  isSaving 
}: { 
  output: ReturnType<typeof runMonteCarloSimulation>;
  onSave: () => void;
  isSaving: boolean;
}) {
  const { results, riskMetrics, scenarioImpacts, baseCase, stressedCase } = output;

  return (
    <div className="space-y-6">
      {/* Formula Legend */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-primary" />
          <h4 className="font-medium">Công thức tính toán</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="p-2 rounded bg-background">
              <p className="font-medium text-foreground">Monte Carlo Simulation</p>
              <p className="font-mono text-muted-foreground mt-1">
                V<sub>i</sub> = V<sub>0</sub> × ∏(1 + Impact<sub>j</sub> × Bernoulli(p<sub>j</sub>))
              </p>
              <p className="text-muted-foreground mt-1">Mỗi lần chạy, kiểm tra xác suất xảy ra của từng kịch bản</p>
            </div>
            <div className="p-2 rounded bg-background">
              <p className="font-medium text-foreground">Tác động thực tế (với biến động)</p>
              <p className="font-mono text-muted-foreground mt-1">
                Impact<sub>actual</sub> = Normal(μ=Impact, σ=Volatility)
              </p>
              <p className="text-muted-foreground mt-1">Phân phối chuẩn với trung bình = tác động, độ lệch = biến động</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="p-2 rounded bg-background">
              <p className="font-medium text-foreground">Value at Risk (VaR 95%)</p>
              <p className="font-mono text-muted-foreground mt-1">
                VaR<sub>95</sub> = V<sub>0</sub> - Percentile<sub>5%</sub>(Results)
              </p>
              <p className="text-muted-foreground mt-1">Tổn thất tối đa với 95% độ tin cậy</p>
            </div>
            <div className="p-2 rounded bg-background">
              <p className="font-medium text-foreground">Tổn thất kỳ vọng</p>
              <p className="font-mono text-muted-foreground mt-1">
                E[Loss] = Σ(V<sub>0</sub> - V<sub>i</sub>) / n, ∀V<sub>i</sub> {"<"} V<sub>0</sub>
              </p>
              <p className="text-muted-foreground mt-1">Trung bình tổn thất của các trường hợp lỗ</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Base Case</span>
            <FormulaTooltip 
              title="Base Case (Giá trị gốc)"
              formula="V₀ = EBITDA hoặc Cash hiện tại"
              explanation="Giá trị ban đầu trước khi áp dụng các kịch bản rủi ro. Lấy từ dữ liệu thực tế của doanh nghiệp."
            />
          </div>
          <p className="text-xl font-bold">{formatVNDCompact(baseCase)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm">Stressed Case</span>
            <FormulaTooltip 
              title="Stressed Case (Kịch bản căng thẳng)"
              formula="V_stressed = V₀ × ∏(1 + Impact_i × Probability_i)"
              explanation="Giá trị kỳ vọng sau khi tính trọng số xác suất của tất cả các kịch bản. Đây là ước tính 'trung bình' của tác động."
            />
          </div>
          <p className="text-xl font-bold text-orange-500">{formatVNDCompact(stressedCase)}</p>
          <p className="text-xs text-muted-foreground">
            {formatPercent(((stressedCase - baseCase) / baseCase) * 100)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">Mean (Kỳ vọng)</span>
            <FormulaTooltip 
              title="Mean - Giá trị kỳ vọng Monte Carlo"
              formula="μ = (1/n) × Σ V_i"
              explanation="Trung bình của tất cả kết quả mô phỏng. Đây là kết quả 'trung bình' sau khi chạy hàng ngàn lần mô phỏng."
            />
          </div>
          <p className="text-xl font-bold">{formatVNDCompact(results.mean)}</p>
          <p className="text-xs text-muted-foreground">
            ±{formatVNDCompact(results.stdDev)}
          </p>
        </Card>
        <Card className="p-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">VaR 95%</span>
            <FormulaTooltip 
              title="Value at Risk 95%"
              formula="VaR₉₅ = V₀ - Percentile₅(Results)"
              explanation="Với 95% độ tin cậy, tổn thất sẽ không vượt quá giá trị này. 5% trường hợp còn lại có thể tệ hơn."
            />
          </div>
          <p className="text-xl font-bold text-red-500">{formatVNDCompact(results.var95)}</p>
          <p className="text-xs text-muted-foreground">Rủi ro tối đa 95%</p>
        </Card>
      </div>

      {/* Percentiles with formula */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <h4 className="font-medium">Phân vị kết quả</h4>
          <FormulaTooltip 
            title="Percentiles (Phân vị)"
            formula="P_k = Value tại vị trí (k/100) × n"
            explanation="Phân vị cho biết % kết quả nằm dưới giá trị đó. VD: P25 = 25% kết quả thấp hơn giá trị này."
          />
        </div>
        <div className="relative h-8 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-between px-2 text-xs text-white font-medium">
            <span>P5: {formatVNDCompact(results.p5)}</span>
            <span>P25: {formatVNDCompact(results.p25)}</span>
            <span>Median: {formatVNDCompact(results.median)}</span>
            <span>P75: {formatVNDCompact(results.p75)}</span>
            <span>P95: {formatVNDCompact(results.p95)}</span>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Worst Case (5% xấu nhất)</span>
          <span>Best Case (5% tốt nhất)</span>
        </div>
      </Card>

      {/* Risk Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-sm text-muted-foreground">Tổn thất kỳ vọng</p>
            <FormulaTooltip 
              title="Expected Loss (Tổn thất kỳ vọng)"
              formula="E[Loss] = Σ(V₀ - V_i) / n, ∀ V_i < V₀"
              explanation="Trung bình số tiền mất đi trong các trường hợp thua lỗ. Chỉ tính những mô phỏng có kết quả thấp hơn giá trị gốc."
            />
          </div>
          <p className="text-2xl font-bold text-red-500">
            {formatVNDCompact(riskMetrics.expectedLoss)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-sm text-muted-foreground">Tổn thất tối đa</p>
            <FormulaTooltip 
              title="Maximum Loss (Tổn thất tối đa)"
              formula="Max Loss = V₀ - min(V_i)"
              explanation="Khoảng cách từ giá trị gốc đến kết quả tệ nhất trong tất cả các mô phỏng."
            />
          </div>
          <p className="text-2xl font-bold text-red-500">
            {formatVNDCompact(riskMetrics.maxLoss)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-sm text-muted-foreground">Xác suất thua lỗ</p>
            <FormulaTooltip 
              title="Probability of Loss (Xác suất thua lỗ)"
              formula="P(Loss) = count(V_i < V₀) / n"
              explanation="Tỷ lệ các mô phỏng có kết quả thấp hơn giá trị gốc. Cho biết khả năng xảy ra thua lỗ."
            />
          </div>
          <p className="text-2xl font-bold text-orange-500">
            {formatPercent(riskMetrics.probabilityOfLoss, true)}
          </p>
        </Card>
      </div>

      {/* Scenario Impacts */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <h4 className="font-medium">Tác động từng kịch bản (kỳ vọng)</h4>
          <FormulaTooltip 
            title="Expected Scenario Impact"
            formula="E[Impact_i] = V₀ × (Impact%_i / 100) × Probability_i"
            explanation="Tác động kỳ vọng = Giá trị gốc × Mức tác động × Xác suất xảy ra. Đây là 'trọng số' đóng góp của mỗi kịch bản."
          />
        </div>
        <div className="space-y-2">
          {scenarioImpacts.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm">{s.name}</span>
              <span className={`font-medium ${s.impact < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {formatVNDCompact(s.impact)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Button onClick={onSave} disabled={isSaving} className="w-full gap-2">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Lưu kết quả mô phỏng
      </Button>
    </div>
  );
}

function DistributionChart({ 
  output, 
  baseValue 
}: { 
  output: ReturnType<typeof runMonteCarloSimulation>;
  baseValue: number;
}) {
  const { results } = output;
  
  const chartData = useMemo(() => {
    const min = results.min;
    const max = results.max;
    const bucketSize = (max - min) / results.distribution.length;
    
    return results.distribution.map((count, i) => {
      const value = min + bucketSize * i + bucketSize / 2;
      const isLoss = value < baseValue;
      return {
        value,
        label: formatVNDCompact(value),
        count,
        isLoss,
      };
    });
  }, [results, baseValue]);

  const maxCount = Math.max(...results.distribution);

  return (
    <div className="space-y-4">
      {/* Distribution Formula Explanation */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-sm">Cách đọc biểu đồ phân phối</h4>
        </div>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="p-2 rounded bg-background">
            <p className="font-medium">Histogram</p>
            <p className="text-muted-foreground mt-1">
              Trục X = Giá trị kết quả, Trục Y = Số lần xuất hiện trong {formatCount(output.results.distribution.reduce((a,b) => a+b, 0))} mô phỏng
            </p>
          </div>
          <div className="p-2 rounded bg-background">
            <p className="font-medium">Vùng đỏ (thua lỗ)</p>
            <p className="text-muted-foreground mt-1">
              Kết quả {"<"} Base Case = Thua lỗ so với giá trị gốc
            </p>
          </div>
          <div className="p-2 rounded bg-background">
            <p className="font-medium">Vùng xanh (có lãi)</p>
            <p className="text-muted-foreground mt-1">
              Kết quả ≥ Base Case = Giữ nguyên hoặc tăng giá trị
            </p>
          </div>
        </div>
      </Card>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload?.[0]) {
                  const data = payload[0].payload;
                  const percentage = ((data.count / output.results.distribution.reduce((a: number, b: number) => a + b, 0)) * 100).toFixed(2);
                  return (
                    <div className="bg-popover border rounded-lg p-3 shadow-lg">
                      <p className="font-medium">{data.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Tần suất: {formatCount(data.count)} lần ({percentage}%)
                      </p>
                      <p className={`text-sm ${data.isLoss ? 'text-red-500' : 'text-green-500'}`}>
                        {data.isLoss ? '📉 Thua lỗ so với Base' : '📈 Giữ/Tăng giá trị'}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine 
              x={formatVNDCompact(baseValue)} 
              stroke="hsl(var(--primary))" 
              strokeDasharray="5 5"
              label={{ value: 'Base', position: 'top' }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.isLoss ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Vùng thua lỗ</p>
            <FormulaTooltip 
              title="Xác suất thua lỗ"
              formula="P(Loss) = Diện tích vùng đỏ / Tổng diện tích"
              explanation="Tỷ lệ phần trăm các kết quả mô phỏng thấp hơn giá trị gốc."
            />
          </div>
          <p className="text-lg font-bold text-red-500">
            {formatPercent(output.riskMetrics.probabilityOfLoss, true)} khả năng
          </p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Vùng có lãi</p>
            <FormulaTooltip 
              title="Xác suất có lãi/giữ nguyên"
              formula="P(Gain) = 1 - P(Loss)"
              explanation="Tỷ lệ phần trăm các kết quả mô phỏng bằng hoặc cao hơn giá trị gốc."
            />
          </div>
          <p className="text-lg font-bold text-green-500">
            {formatPercent(1 - output.riskMetrics.probabilityOfLoss, true)} khả năng
          </p>
        </div>
      </div>
    </div>
  );
}

export default StressTestingPanel;
