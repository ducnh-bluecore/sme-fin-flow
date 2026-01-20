import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FlaskConical, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  History,
  Play,
  RotateCcw,
  Info
} from 'lucide-react';
import { useRiskAppetites, useActiveRiskAppetite } from '@/hooks/useRiskAppetite';
import { 
  useRunStressTest, 
  usePreviewStressTest, 
  useStressTestHistory,
  getImpactTypeColor,
  getImpactTypeLabel,
  formatDelta
} from '@/hooks/useStressTest';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SimulatedChange {
  metricCode: string;
  metricLabel: string;
  originalThreshold: number;
  simulatedThreshold: number;
  operator: string;
  unit: string;
}

export function RiskStressTestConsole() {
  const [activeTab, setActiveTab] = useState('simulate');
  const [testName, setTestName] = useState('');
  const [simulatedChanges, setSimulatedChanges] = useState<SimulatedChange[]>([]);
  const [previewResult, setPreviewResult] = useState<any>(null);

  const { data: appetites } = useRiskAppetites();
  const activeAppetite = appetites?.find(a => a.status === 'active');
  const { data: history } = useStressTestHistory();
  
  const runStressTest = useRunStressTest();
  const previewStressTest = usePreviewStressTest();

  // Initialize simulated changes from active appetite rules
  useEffect(() => {
    if (activeAppetite?.risk_appetite_rules) {
      const rules = activeAppetite.risk_appetite_rules as any[];
      setSimulatedChanges(
        rules
          .filter(r => r.is_enabled)
          .map(r => ({
            metricCode: r.metric_code,
            metricLabel: r.metric_label || r.metric_code,
            originalThreshold: Number(r.threshold),
            simulatedThreshold: Number(r.threshold),
            operator: r.operator,
            unit: r.unit || '',
          }))
      );
    }
  }, [activeAppetite]);

  const handleThresholdChange = async (metricCode: string, value: number) => {
    const updated = simulatedChanges.map(c => 
      c.metricCode === metricCode 
        ? { ...c, simulatedThreshold: value }
        : c
    );
    setSimulatedChanges(updated);

    // Debounced preview
    try {
      const result = await previewStressTest.mutateAsync(
        updated.map(c => ({
          metricCode: c.metricCode,
          originalThreshold: c.originalThreshold,
          simulatedThreshold: c.simulatedThreshold,
          operator: c.operator,
        }))
      );
      setPreviewResult(result);
    } catch (error) {
      // Silent fail for preview
    }
  };

  const handleReset = () => {
    setSimulatedChanges(changes => 
      changes.map(c => ({ ...c, simulatedThreshold: c.originalThreshold }))
    );
    setPreviewResult(null);
  };

  const handleRunTest = async () => {
    try {
      const result = await runStressTest.mutateAsync({
        simulatedChanges: simulatedChanges.map(c => ({
          metricCode: c.metricCode,
          originalThreshold: c.originalThreshold,
          simulatedThreshold: c.simulatedThreshold,
          operator: c.operator,
        })),
        testName: testName || `Stress Test ${new Date().toLocaleDateString()}`,
      });
      toast.success('Stress test completed and saved');
      setActiveTab('history');
    } catch (error) {
      toast.error('Failed to run stress test');
    }
  };

  const hasChanges = simulatedChanges.some(c => c.simulatedThreshold !== c.originalThreshold);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Risk Stress Testing</h2>
          <p className="text-muted-foreground">
            Simulate different risk appetite thresholds to understand trade-offs
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <FlaskConical className="h-3 w-3" />
          Simulation Mode
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="simulate">Run Simulation</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
        </TabsList>

        <TabsContent value="simulate" className="space-y-4">
          {!activeAppetite ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active risk appetite to simulate against.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Threshold Sliders */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Adjust Thresholds</CardTitle>
                    <CardDescription>
                      Drag sliders to simulate tighter or looser risk appetite
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {simulatedChanges.map((change) => (
                      <div key={change.metricCode} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            {change.metricLabel}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Original: {change.originalThreshold}{change.unit}</p>
                                  <p>Operator: {change.operator}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={change.simulatedThreshold}
                              onChange={(e) => handleThresholdChange(change.metricCode, parseFloat(e.target.value))}
                              className="w-24 text-right"
                            />
                            <span className="text-sm text-muted-foreground w-8">{change.unit}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground w-20">Looser</span>
                          <Slider
                            value={[change.simulatedThreshold]}
                            min={change.originalThreshold * 0.5}
                            max={change.originalThreshold * 2}
                            step={change.originalThreshold * 0.01}
                            onValueChange={([value]) => handleThresholdChange(change.metricCode, value)}
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-20 text-right">Tighter</span>
                        </div>
                        {change.simulatedThreshold !== change.originalThreshold && (
                          <div className="flex items-center gap-2 text-xs">
                            {change.simulatedThreshold < change.originalThreshold ? (
                              <Badge className="bg-amber-100 text-amber-800">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {formatDelta(change.simulatedThreshold - change.originalThreshold, change.unit)}
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                {formatDelta(change.simulatedThreshold - change.originalThreshold, change.unit)}
                              </Badge>
                            )}
                            <span className="text-muted-foreground">from original</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex items-center gap-4">
                  <Input
                    placeholder="Test name (optional)"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button onClick={handleRunTest} disabled={!hasChanges || runStressTest.isPending}>
                    <Play className="h-4 w-4 mr-2" />
                    Run & Save Test
                  </Button>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Live Preview</CardTitle>
                    <CardDescription>
                      Real-time impact of threshold changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {previewResult ? (
                      <>
                        <div className={`p-3 rounded-lg ${
                          previewResult.newBreaches > 0 
                            ? 'bg-red-50 border border-red-200' 
                            : previewResult.resolved > 0
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-muted'
                        }`}>
                          <p className="text-sm font-medium">
                            {previewResult.message}
                          </p>
                        </div>

                        {previewResult.impacts?.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Affected Rules</h4>
                            {previewResult.impacts.map((impact: any, idx: number) => (
                              <div 
                                key={idx}
                                className={`p-2 rounded text-sm ${getImpactTypeColor(impact.impactType)}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{impact.metricLabel}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {getImpactTypeLabel(impact.impactType)}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Adjust thresholds to see impact</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">What This Means</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <p>
                      <strong>Tighter thresholds</strong> = More breaches, more approvals, less automation
                    </p>
                    <p>
                      <strong>Looser thresholds</strong> = Fewer breaches, but higher risk exposure
                    </p>
                    <p className="pt-2 border-t">
                      Board uses this to balance risk vs. operational efficiency.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Test History
              </CardTitle>
              <CardDescription>
                Review past stress test simulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history?.tests?.length ? (
                  history.tests.map((test: any) => (
                    <Card key={test.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{test.test_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(test.simulated_at).toLocaleString()}
                          </p>
                          {test.impact_summary && (
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                                {test.impact_summary.breachChanges?.newBreaches || 0} new breaches
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                {test.impact_summary.breachChanges?.resolved || 0} resolved
                              </span>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No stress tests run yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
