import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FlaskConical, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Play,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Wallet,
  BarChart3,
  Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';

interface ScenarioParams {
  budgetChange: number; // percentage change
  cpcChange: number;
  conversionRateChange: number;
  aovChange: number;
}

interface ScenarioResult {
  month: string;
  baseline: number;
  optimistic: number;
  pessimistic: number;
  scenario: number;
}

const baselineData: ScenarioResult[] = [
  { month: 'T1', baseline: 5200, optimistic: 5800, pessimistic: 4600, scenario: 5500 },
  { month: 'T2', baseline: 5400, optimistic: 6200, pessimistic: 4800, scenario: 5900 },
  { month: 'T3', baseline: 5600, optimistic: 6600, pessimistic: 4900, scenario: 6300 },
  { month: 'T4', baseline: 5800, optimistic: 7000, pessimistic: 5000, scenario: 6700 },
  { month: 'T5', baseline: 6000, optimistic: 7400, pessimistic: 5100, scenario: 7100 },
  { month: 'T6', baseline: 6200, optimistic: 7800, pessimistic: 5200, scenario: 7500 },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

export default function ScenarioPlannerPage() {
  const [activeTab, setActiveTab] = useState('builder');
  const [params, setParams] = useState<ScenarioParams>({
    budgetChange: 20,
    cpcChange: -5,
    conversionRateChange: 10,
    aovChange: 5,
  });
  const [isSimulating, setIsSimulating] = useState(false);

  // Calculate projected metrics based on params
  const currentBudget = 1600000000; // 1.6B
  const currentRevenue = 5200000000; // 5.2B
  const currentROAS = 3.25;
  const currentCM = 1560000000; // 1.56B (30% margin)

  const projectedBudget = currentBudget * (1 + params.budgetChange / 100);
  const cpcEffect = 1 / (1 + params.cpcChange / 100); // Lower CPC = more reach
  const conversionEffect = 1 + params.conversionRateChange / 100;
  const aovEffect = 1 + params.aovChange / 100;
  
  const projectedRevenue = currentRevenue * (1 + params.budgetChange / 100) * cpcEffect * conversionEffect * aovEffect;
  const projectedROAS = projectedRevenue / projectedBudget;
  const projectedCM = projectedRevenue * 0.30; // Assuming 30% margin

  const revenueChange = ((projectedRevenue - currentRevenue) / currentRevenue) * 100;
  const cmChange = ((projectedCM - currentCM) / currentCM) * 100;

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 1500);
  };

  const savedScenarios = [
    { name: 'Q2 Growth Push', date: '2024-01-15', budgetChange: 30, projectedROAS: 3.8 },
    { name: 'Cost Optimization', date: '2024-01-10', budgetChange: -15, projectedROAS: 4.2 },
    { name: 'TikTok Scale Test', date: '2024-01-08', budgetChange: 50, projectedROAS: 2.9 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-violet-400" />
            Scenario Planner
          </h1>
          <p className="text-slate-400 mt-1">Mô phỏng What-if cho marketing spend</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
          <Button variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            Lưu Scenario
          </Button>
          <Button 
            className="bg-violet-600 hover:bg-violet-700 gap-2"
            onClick={handleSimulate}
            disabled={isSimulating}
          >
            {isSimulating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Đang mô phỏng...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Chạy mô phỏng
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Scenario Builder */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tham số mô phỏng</CardTitle>
              <CardDescription>Điều chỉnh các thông số để xem tác động</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Budget Change */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-violet-400" />
                    Thay đổi ngân sách
                  </Label>
                  <Badge className={cn(
                    params.budgetChange >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {params.budgetChange >= 0 ? '+' : ''}{params.budgetChange}%
                  </Badge>
                </div>
                <Slider
                  value={[params.budgetChange]}
                  onValueChange={([v]) => setParams(p => ({ ...p, budgetChange: v }))}
                  min={-50}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-50%</span>
                  <span>+100%</span>
                </div>
              </div>

              {/* CPC Change */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-400" />
                    Thay đổi CPC
                  </Label>
                  <Badge className={cn(
                    params.cpcChange <= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {params.cpcChange >= 0 ? '+' : ''}{params.cpcChange}%
                  </Badge>
                </div>
                <Slider
                  value={[params.cpcChange]}
                  onValueChange={([v]) => setParams(p => ({ ...p, cpcChange: v }))}
                  min={-30}
                  max={30}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-30% (tốt hơn)</span>
                  <span>+30% (xấu hơn)</span>
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-400" />
                    Conversion Rate
                  </Label>
                  <Badge className={cn(
                    params.conversionRateChange >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {params.conversionRateChange >= 0 ? '+' : ''}{params.conversionRateChange}%
                  </Badge>
                </div>
                <Slider
                  value={[params.conversionRateChange]}
                  onValueChange={([v]) => setParams(p => ({ ...p, conversionRateChange: v }))}
                  min={-20}
                  max={30}
                  step={5}
                />
              </div>

              {/* AOV */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-yellow-400" />
                    Average Order Value
                  </Label>
                  <Badge className={cn(
                    params.aovChange >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {params.aovChange >= 0 ? '+' : ''}{params.aovChange}%
                  </Badge>
                </div>
                <Slider
                  value={[params.aovChange]}
                  onValueChange={([v]) => setParams(p => ({ ...p, aovChange: v }))}
                  min={-15}
                  max={25}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Saved Scenarios */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scenarios đã lưu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedScenarios.map((scenario, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-3"
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{scenario.name}</p>
                    <p className="text-xs text-muted-foreground">{scenario.date}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {scenario.budgetChange > 0 ? '+' : ''}{scenario.budgetChange}%
                  </Badge>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Projected Budget</p>
                <p className="text-xl font-bold">{formatCurrency(projectedBudget)}</p>
                <p className={cn(
                  "text-xs",
                  params.budgetChange >= 0 ? "text-yellow-400" : "text-emerald-400"
                )}>
                  {params.budgetChange >= 0 ? '+' : ''}{params.budgetChange}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Projected Revenue</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(projectedRevenue)}</p>
                <p className={cn(
                  "text-xs flex items-center gap-1",
                  revenueChange >= 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  {revenueChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Projected ROAS</p>
                <p className={cn(
                  "text-xl font-bold",
                  projectedROAS >= currentROAS ? "text-emerald-400" : "text-red-400"
                )}>
                  {projectedROAS.toFixed(2)}x
                </p>
                <p className={cn(
                  "text-xs",
                  projectedROAS >= currentROAS ? "text-emerald-400" : "text-red-400"
                )}>
                  vs {currentROAS}x hiện tại
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Projected CM</p>
                <p className="text-xl font-bold text-violet-400">{formatCurrency(projectedCM)}</p>
                <p className={cn(
                  "text-xs flex items-center gap-1",
                  cmChange >= 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  {cmChange >= 0 ? '+' : ''}{cmChange.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Projection Chart */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dự báo doanh thu 6 tháng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={baselineData}>
                    <defs>
                      <linearGradient id="colorScenario" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}M`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#f8fafc' }}
                      formatter={(value: number) => [`${value}M`, '']}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="pessimistic" 
                      stroke="#ef4444" 
                      fill="none"
                      strokeDasharray="5 5"
                      name="Bi quan"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="baseline" 
                      stroke="#94a3b8" 
                      fill="none"
                      name="Baseline"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="optimistic" 
                      stroke="#10b981" 
                      fill="none"
                      strokeDasharray="5 5"
                      name="Lạc quan"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="scenario" 
                      stroke="#8b5cf6" 
                      fill="url(#colorScenario)"
                      strokeWidth={2}
                      name="Scenario"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                Đánh giá rủi ro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium text-emerald-400">Cơ hội</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Revenue có thể tăng đến +{(revenueChange * 1.2).toFixed(0)}%</li>
                    <li>• ROAS cải thiện nếu CVR tăng</li>
                    <li>• Scale nhanh trong Q2</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <span className="font-medium text-yellow-400">Lưu ý</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Cash flow tăng {formatCurrency(projectedBudget - currentBudget)}/tháng</li>
                    <li>• Cần monitor CPC hàng tuần</li>
                    <li>• Creative fatigue có thể xảy ra</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="font-medium text-red-400">Rủi ro</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• ROAS có thể giảm nếu CPC tăng</li>
                    <li>• Worst case: -{(revenueChange * 0.5).toFixed(0)}% revenue</li>
                    <li>• Inventory constraints</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
