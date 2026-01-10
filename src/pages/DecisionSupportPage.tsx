import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Scale, 
  Calculator, 
  TrendingUp, 
  GitCompare,
  Target,
  DollarSign,
  Clock,
  Activity,
  Bot,
  FileText,
  Save,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';

// Analysis Components
import { DecisionAdvisorChat } from '@/components/decision/DecisionAdvisorChat';
import { ROIAnalysis } from '@/components/decision/ROIAnalysis';
import { NPVIRRAnalysis } from '@/components/decision/NPVIRRAnalysis';
import { PaybackAnalysis } from '@/components/decision/PaybackAnalysis';
import { SensitivityAnalysis } from '@/components/decision/SensitivityAnalysis';
import { SavedAnalysesList } from '@/components/decision/SavedAnalysesList';
import { useSaveDecisionAnalysis } from '@/hooks/useDecisionAnalyses';

// Keep original components inline for now
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { formatVNDCompact, formatVND, formatDate, formatCount } from '@/lib/formatters';
import { CheckCircle2 } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from 'recharts';

type AdvisorContext = Record<string, any>;

// Make vs Buy Analysis Component
function MakeVsBuyAnalysis({ onContextChange }: { onContextChange?: (ctx: AdvisorContext) => void }) {
  const saveAnalysis = useSaveDecisionAnalysis();
  
  const [makeData, setMakeData] = useState({
    fixedCost: 500000000,
    variableCostPerUnit: 45000,
    volume: 10000,
  });
  
  const [buyData, setBuyData] = useState({
    pricePerUnit: 65000,
    volume: 10000,
  });

  const makeTotalCost = makeData.fixedCost + (makeData.variableCostPerUnit * makeData.volume);
  const buyTotalCost = buyData.pricePerUnit * buyData.volume;
  const breakEvenVolume = Math.ceil(makeData.fixedCost / (buyData.pricePerUnit - makeData.variableCostPerUnit));
  
  const recommendation = makeTotalCost < buyTotalCost ? 'make' : 'buy';
  const savings = Math.abs(makeTotalCost - buyTotalCost);

  useEffect(() => {
    onContextChange?.({
      analysisType: 'make-vs-buy',
      inputs: { makeData, buyData },
      outputs: { makeTotalCost, buyTotalCost, breakEvenVolume, recommendation, savings },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeData, buyData, makeTotalCost, buyTotalCost, breakEvenVolume, recommendation, savings]);

  const comparisonData = Array.from({ length: 10 }, (_, i) => {
    const vol = (i + 1) * 2000;
    return {
      volume: vol,
      make: makeData.fixedCost + (makeData.variableCostPerUnit * vol),
      buy: buyData.pricePerUnit * vol,
    };
  });

  const handleSave = () => {
    saveAnalysis.mutate({
      analysis_type: 'make_vs_buy',
      title: `Make vs Buy - ${formatDate(new Date())}`,
      description: `So sánh tự sản xuất vs thuê ngoài với sản lượng ${formatCount(makeData.volume)} đơn vị`,
      parameters: { makeData, buyData },
      results: { makeTotalCost, buyTotalCost, breakEvenVolume, recommendation, savings },
      recommendation: recommendation === 'make' ? 'Tự sản xuất' : 'Thuê ngoài',
      ai_insights: null,
      status: 'completed',
      approved_by: null,
      approved_at: null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-500" />
              Tự sản xuất (Make)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Chi phí cố định (VND)</Label>
              <Input type="number" value={makeData.fixedCost} onChange={(e) => setMakeData({ ...makeData, fixedCost: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Chi phí biến đổi/đơn vị (VND)</Label>
              <Input type="number" value={makeData.variableCostPerUnit} onChange={(e) => setMakeData({ ...makeData, variableCostPerUnit: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Sản lượng dự kiến</Label>
              <Input type="number" value={makeData.volume} onChange={(e) => setMakeData({ ...makeData, volume: Number(e.target.value) })} />
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-muted-foreground">Tổng chi phí</p>
              <p className="text-2xl font-bold text-blue-500">{formatVNDCompact(makeTotalCost)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Thuê ngoài (Buy)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Giá mua/đơn vị (VND)</Label>
              <Input type="number" value={buyData.pricePerUnit} onChange={(e) => setBuyData({ ...buyData, pricePerUnit: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Sản lượng dự kiến</Label>
              <Input type="number" value={buyData.volume} onChange={(e) => setBuyData({ ...buyData, volume: Number(e.target.value) })} />
            </div>
            <div className="h-[72px]" />
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-muted-foreground">Tổng chi phí</p>
              <p className="text-2xl font-bold text-green-500">{formatVNDCompact(buyTotalCost)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={recommendation === 'make' ? 'border-blue-500/50' : 'border-green-500/50'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Khuyến nghị: {recommendation === 'make' ? 'TỰ SẢN XUẤT' : 'THUÊ NGOÀI'}</h3>
              <p className="text-muted-foreground">Tiết kiệm: {formatVNDCompact(savings)}</p>
              <p className="text-sm text-muted-foreground mt-1">Break-even point: {breakEvenVolume.toLocaleString()} đơn vị</p>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${recommendation === 'make' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
              <CheckCircle2 className={`h-8 w-8 ${recommendation === 'make' ? 'text-blue-500' : 'text-green-500'}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Biểu đồ so sánh chi phí theo sản lượng</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="volume" tickFormatter={(v) => `${(v/1000)}K`} />
                <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                <Tooltip formatter={(v) => formatVNDCompact(v as number)} />
                <Legend />
                <ReferenceLine x={breakEvenVolume} stroke="red" strokeDasharray="3 3" label="Break-even" />
                <Line type="monotone" dataKey="make" name="Tự sản xuất" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="buy" name="Thuê ngoài" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" disabled={saveAnalysis.isPending}>
        <Save className="h-4 w-4 mr-2" />
        Lưu phân tích
      </Button>
    </div>
  );
}

// Break-even Analysis Component
function BreakEvenAnalysis({ onContextChange }: { onContextChange?: (ctx: AdvisorContext) => void }) {
  const saveAnalysis = useSaveDecisionAnalysis();
  
  const [params, setParams] = useState({
    fixedCosts: 2000000000,
    sellingPrice: 150000,
    variableCost: 90000,
    currentVolume: 50000,
  });

  const contributionMargin = params.sellingPrice - params.variableCost;
  const breakEvenUnits = Math.ceil(params.fixedCosts / contributionMargin);
  const breakEvenRevenue = breakEvenUnits * params.sellingPrice;
  const marginOfSafety = ((params.currentVolume - breakEvenUnits) / params.currentVolume) * 100;

  useEffect(() => {
    onContextChange?.({
      analysisType: 'break-even',
      inputs: params,
      outputs: { contributionMargin, breakEvenUnits, breakEvenRevenue, marginOfSafety },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, contributionMargin, breakEvenUnits, breakEvenRevenue, marginOfSafety]);

  const chartData = Array.from({ length: 10 }, (_, i) => {
    const vol = (i + 1) * 10000;
    return {
      volume: vol,
      revenue: vol * params.sellingPrice,
      totalCost: params.fixedCosts + (vol * params.variableCost),
    };
  });

  const handleSave = () => {
    saveAnalysis.mutate({
      analysis_type: 'break_even',
      title: `Break-even Analysis - ${formatDate(new Date())}`,
      description: `Phân tích hòa vốn với chi phí cố định ${formatVNDCompact(params.fixedCosts)}`,
      parameters: params,
      results: { contributionMargin, breakEvenUnits, breakEvenRevenue, marginOfSafety },
      recommendation: marginOfSafety > 0 ? 'Trên điểm hòa vốn' : 'Dưới điểm hòa vốn',
      ai_insights: null,
      status: 'completed',
      approved_by: null,
      approved_at: null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Break-even (Đơn vị)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCount(breakEvenUnits)}</div>
            <p className="text-sm text-muted-foreground">đơn vị sản phẩm</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Break-even (Doanh thu)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatVNDCompact(breakEvenRevenue)}</div>
            <p className="text-sm text-muted-foreground">doanh thu tối thiểu</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Margin of Safety</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${marginOfSafety > 0 ? 'text-green-500' : 'text-red-500'}`}>{marginOfSafety.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">{marginOfSafety > 0 ? 'Trên break-even' : 'Dưới break-even'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Điều chỉnh tham số</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Chi phí cố định: {formatVNDCompact(params.fixedCosts)}</Label>
              <Slider value={[params.fixedCosts]} onValueChange={([v]) => setParams({ ...params, fixedCosts: v })} min={500000000} max={5000000000} step={100000000} className="mt-2" />
            </div>
            <div>
              <Label>Giá bán: {formatVND(params.sellingPrice)}</Label>
              <Slider value={[params.sellingPrice]} onValueChange={([v]) => setParams({ ...params, sellingPrice: v })} min={100000} max={300000} step={5000} className="mt-2" />
            </div>
            <div>
              <Label>Chi phí biến đổi: {formatVND(params.variableCost)}</Label>
              <Slider value={[params.variableCost]} onValueChange={([v]) => setParams({ ...params, variableCost: v })} min={50000} max={150000} step={5000} className="mt-2" />
            </div>
            <div>
              <Label>Sản lượng hiện tại: {params.currentVolume.toLocaleString()}</Label>
              <Slider value={[params.currentVolume]} onValueChange={([v]) => setParams({ ...params, currentVolume: v })} min={10000} max={100000} step={5000} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Biểu đồ Break-even</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="volume" tickFormatter={(v) => `${(v/1000)}K`} />
                <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                <Tooltip formatter={(v) => formatVNDCompact(v as number)} />
                <Legend />
                <ReferenceLine x={breakEvenUnits} stroke="red" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="totalCost" name="Tổng chi phí" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" disabled={saveAnalysis.isPending}>
        <Save className="h-4 w-4 mr-2" />
        Lưu phân tích
      </Button>
    </div>
  );
}

export default function DecisionSupportPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('make-vs-buy');
  const [advisorContext, setAdvisorContext] = useState<AdvisorContext>({});

  // Don't reset context when switching tabs - let components populate their own context

  return (
    <>
      <Helmet>
        <title>Decision Support | Bluecore FDP</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title={t('nav.decisionSupport')}
          subtitle="Công cụ hỗ trợ ra quyết định cho CFO với AI"
        />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="make-vs-buy" className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Make vs Buy
                </TabsTrigger>
                <TabsTrigger value="break-even" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Break-even
                </TabsTrigger>
                <TabsTrigger value="roi" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  ROI
                </TabsTrigger>
                <TabsTrigger value="npv-irr" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  NPV/IRR
                </TabsTrigger>
                <TabsTrigger value="payback" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Payback
                </TabsTrigger>
                <TabsTrigger value="sensitivity" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Sensitivity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="make-vs-buy" className="mt-6">
                <MakeVsBuyAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
              <TabsContent value="break-even" className="mt-6">
                <BreakEvenAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
              <TabsContent value="roi" className="mt-6">
                <ROIAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
              <TabsContent value="npv-irr" className="mt-6">
                <NPVIRRAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
              <TabsContent value="payback" className="mt-6">
                <PaybackAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
              <TabsContent value="sensitivity" className="mt-6">
                <SensitivityAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <div className="h-[500px]">
              <DecisionAdvisorChat analysisType={activeTab} context={advisorContext} />
            </div>
            <SavedAnalysesList />
          </div>
        </div>
      </div>
    </>
  );
}
