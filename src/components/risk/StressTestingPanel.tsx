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
  BarChart3, Percent, DollarSign, RefreshCw, Save, Loader2
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { formatVNDCompact } from '@/lib/formatters';
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
              Mô phỏng tác động của các kịch bản rủi ro với {iterations.toLocaleString()} lần chạy
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
                            <span>{(scenario.probability * 100).toFixed(0)}%</span>
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
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Base Case</span>
          </div>
          <p className="text-xl font-bold">{formatVNDCompact(baseCase)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm">Stressed Case</span>
          </div>
          <p className="text-xl font-bold text-orange-500">{formatVNDCompact(stressedCase)}</p>
          <p className="text-xs text-muted-foreground">
            {(((stressedCase - baseCase) / baseCase) * 100).toFixed(1)}%
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">Mean (Kỳ vọng)</span>
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
          </div>
          <p className="text-xl font-bold text-red-500">{formatVNDCompact(results.var95)}</p>
          <p className="text-xs text-muted-foreground">Rủi ro tối đa 95%</p>
        </Card>
      </div>

      {/* Percentiles */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Phân vị kết quả</h4>
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
          <span>Worst Case</span>
          <span>Best Case</span>
        </div>
      </Card>

      {/* Risk Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Tổn thất kỳ vọng</p>
          <p className="text-2xl font-bold text-red-500">
            {formatVNDCompact(riskMetrics.expectedLoss)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Tổn thất tối đa</p>
          <p className="text-2xl font-bold text-red-500">
            {formatVNDCompact(riskMetrics.maxLoss)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Xác suất thua lỗ</p>
          <p className="text-2xl font-bold text-orange-500">
            {(riskMetrics.probabilityOfLoss * 100).toFixed(1)}%
          </p>
        </Card>
      </div>

      {/* Scenario Impacts */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Tác động từng kịch bản (kỳ vọng)</h4>
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
                  return (
                    <div className="bg-popover border rounded-lg p-3 shadow-lg">
                      <p className="font-medium">{data.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Tần suất: {data.count.toLocaleString()} lần
                      </p>
                      <p className={`text-sm ${data.isLoss ? 'text-red-500' : 'text-green-500'}`}>
                        {data.isLoss ? 'Thua lỗ' : 'Có lãi'}
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
          <p className="text-muted-foreground">Vùng thua lỗ</p>
          <p className="text-lg font-bold text-red-500">
            {(output.riskMetrics.probabilityOfLoss * 100).toFixed(1)}% khả năng
          </p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-muted-foreground">Vùng có lãi</p>
          <p className="text-lg font-bold text-green-500">
            {((1 - output.riskMetrics.probabilityOfLoss) * 100).toFixed(1)}% khả năng
          </p>
        </div>
      </div>
    </div>
  );
}

export default StressTestingPanel;
