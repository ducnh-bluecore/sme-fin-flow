import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Target, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Clock,
  BarChart3,
  ArrowRightLeft,
  Archive,
  Play,
  Plus
} from 'lucide-react';
import { 
  useScenarioTemplates,
  useScenarioList,
  useRunScenario,
  useCompareScenarios,
  useArchiveScenario,
  getScenarioTypeLabel,
  getScenarioTypeIcon,
  formatCurrency,
  getSeverityColor
} from '@/hooks/useBoardScenarios';
import { toast } from 'sonner';

export function BoardScenarioRoom() {
  const [activeTab, setActiveTab] = useState('create');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [scenarioName, setScenarioName] = useState('');
  const [description, setDescription] = useState('');
  const [assumptions, setAssumptions] = useState({
    revenueChange: 0,
    arDelayDays: 0,
    costInflation: 0,
    automationPaused: false,
  });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const { data: templates } = useScenarioTemplates();
  const { data: scenarios } = useScenarioList();
  const { data: comparison } = useCompareScenarios(compareIds);
  const runScenario = useRunScenario();
  const archiveScenario = useArchiveScenario();

  const handleTemplateSelect = (type: string) => {
    setSelectedTemplate(type);
    const template = templates?.templates?.find(t => t.type === type);
    if (template) {
      setScenarioName(template.name);
      setDescription(template.description);
      setAssumptions({
        revenueChange: template.defaultAssumptions.revenueChange || 0,
        arDelayDays: template.defaultAssumptions.arDelayDays || 0,
        costInflation: template.defaultAssumptions.costInflation || 0,
        automationPaused: template.defaultAssumptions.automationPaused || false,
      });
    }
  };

  const handleRunScenario = async () => {
    if (!scenarioName || !selectedTemplate) {
      toast.error('Please select a scenario type and name');
      return;
    }

    try {
      const result = await runScenario.mutateAsync({
        scenarioName,
        scenarioType: selectedTemplate,
        description,
        assumptions,
      });
      setSimulationResult(result);
      toast.success('Scenario simulation complete');
    } catch (error) {
      toast.error('Failed to run scenario');
    }
  };

  const handleCompareToggle = (scenarioId: string) => {
    setCompareIds(prev => 
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId].slice(-3) // Max 3 scenarios
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Board Scenario Room</h2>
          <p className="text-muted-foreground">
            Strategic scenario simulation for Board decision-making
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Target className="h-3 w-3" />
          Strategy Planning
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Create Scenario</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="history">Saved Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Scenario Builder */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scenario Builder</CardTitle>
                  <CardDescription>
                    Choose a template and adjust assumptions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Template Selection */}
                  <div className="space-y-2">
                    <Label>Scenario Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {templates?.templates?.map((template) => (
                        <Button
                          key={template.type}
                          variant={selectedTemplate === template.type ? 'default' : 'outline'}
                          className="justify-start h-auto py-3"
                          onClick={() => handleTemplateSelect(template.type)}
                        >
                          <span className="text-lg mr-2">{getScenarioTypeIcon(template.type)}</span>
                          <div className="text-left">
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs opacity-70">{template.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {selectedTemplate && (
                    <>
                      {/* Scenario Name */}
                      <div className="space-y-2">
                        <Label>Scenario Name</Label>
                        <Input
                          value={scenarioName}
                          onChange={(e) => setScenarioName(e.target.value)}
                          placeholder="e.g., Q2 Pessimistic Forecast"
                        />
                      </div>

                      {/* Assumptions */}
                      <div className="space-y-4">
                        <Label>Assumptions</Label>
                        
                        {(selectedTemplate === 'REVENUE_SHOCK' || selectedTemplate === 'CUSTOM') && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Revenue Change</span>
                              <span className={assumptions.revenueChange < 0 ? 'text-red-600' : 'text-green-600'}>
                                {assumptions.revenueChange >= 0 ? '+' : ''}{assumptions.revenueChange}%
                              </span>
                            </div>
                            <Slider
                              value={[assumptions.revenueChange]}
                              min={-50}
                              max={50}
                              step={5}
                              onValueChange={([v]) => setAssumptions(prev => ({ ...prev, revenueChange: v }))}
                            />
                          </div>
                        )}

                        {(selectedTemplate === 'AR_DELAY' || selectedTemplate === 'CUSTOM') && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>AR Collection Delay</span>
                              <span className="text-amber-600">+{assumptions.arDelayDays} days</span>
                            </div>
                            <Slider
                              value={[assumptions.arDelayDays]}
                              min={0}
                              max={60}
                              step={5}
                              onValueChange={([v]) => setAssumptions(prev => ({ ...prev, arDelayDays: v }))}
                            />
                          </div>
                        )}

                        {(selectedTemplate === 'COST_INFLATION' || selectedTemplate === 'CUSTOM') && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Cost Inflation</span>
                              <span className="text-amber-600">+{assumptions.costInflation}%</span>
                            </div>
                            <Slider
                              value={[assumptions.costInflation]}
                              min={0}
                              max={30}
                              step={1}
                              onValueChange={([v]) => setAssumptions(prev => ({ ...prev, costInflation: v }))}
                            />
                          </div>
                        )}

                        {(selectedTemplate === 'AUTOMATION_PAUSE' || selectedTemplate === 'CUSTOM') && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="automation"
                              checked={assumptions.automationPaused}
                              onCheckedChange={(checked) => 
                                setAssumptions(prev => ({ ...prev, automationPaused: !!checked }))
                              }
                            />
                            <Label htmlFor="automation" className="text-sm">
                              Disable all automation
                            </Label>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Context for this scenario..."
                          rows={2}
                        />
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={handleRunScenario}
                        disabled={runScenario.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run Scenario
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Results Panel */}
            <div className="space-y-4">
              {simulationResult ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Projected Outcomes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {simulationResult.projectedOutcomes?.map((outcome: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{outcome.metric}</p>
                            <p className="text-sm text-muted-foreground">
                              Baseline: {outcome.unit === 'VND' 
                                ? formatCurrency(outcome.baseline) 
                                : `${outcome.baseline}${outcome.unit}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              {outcome.unit === 'VND' 
                                ? formatCurrency(outcome.projected) 
                                : `${outcome.projected.toFixed(1)}${outcome.unit}`}
                            </p>
                            <p className={`text-sm flex items-center gap-1 justify-end ${
                              outcome.delta < 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {outcome.delta < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : (
                                <TrendingUp className="h-3 w-3" />
                              )}
                              {outcome.deltaPercent.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {simulationResult.riskBreaches?.length > 0 && (
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-5 w-5" />
                          Risk Appetite Breaches
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {simulationResult.riskBreaches.map((breach: any, idx: number) => (
                          <div 
                            key={idx} 
                            className={`p-3 rounded-lg border ${getSeverityColor(breach.severity)}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{breach.metricLabel}</span>
                              <Badge variant="outline" className="uppercase text-xs">
                                {breach.severity}
                              </Badge>
                            </div>
                            <p className="text-sm mt-1">
                              Projected: {breach.projectedValue.toFixed(2)} 
                              (Threshold: {breach.threshold})
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {simulationResult.controlImpacts && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Control Impacts</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Automation</span>
                          <Badge variant={simulationResult.controlImpacts.automationAffected ? 'destructive' : 'secondary'}>
                            {simulationResult.controlImpacts.automationAffected ? 'Affected' : 'Unchanged'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Approval Volume</span>
                          <Badge variant="outline">
                            {simulationResult.controlImpacts.approvalVolumeChange}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Manual Review</span>
                          <Badge variant={simulationResult.controlImpacts.manualReviewRequired ? 'destructive' : 'secondary'}>
                            {simulationResult.controlImpacts.manualReviewRequired ? 'Required' : 'Not Required'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      Select a scenario template and run simulation to see projections
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Compare Scenarios
              </CardTitle>
              <CardDescription>
                Select 2-3 scenarios to compare side-by-side
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scenarios?.scenarios?.length ? (
                  <>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {scenarios.scenarios.slice(0, 6).map((scenario) => (
                        <Button
                          key={scenario.id}
                          variant={compareIds.includes(scenario.id) ? 'default' : 'outline'}
                          className="justify-start h-auto py-3"
                          onClick={() => handleCompareToggle(scenario.id)}
                        >
                          <span className="text-lg mr-2">{getScenarioTypeIcon(scenario.scenario_type)}</span>
                          <div className="text-left">
                            <div className="font-medium">{scenario.scenario_name}</div>
                            <div className="text-xs opacity-70">
                              {new Date(scenario.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>

                    {comparison && compareIds.length >= 2 && (
                      <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">Metric</th>
                              <th className="text-right py-2 px-4">Baseline</th>
                              {comparison.scenarios?.map((s: any) => (
                                <th key={s.id} className="text-right py-2 px-4">
                                  {s.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(comparison.comparison || {}).map(([metric, values]: [string, any]) => (
                              <tr key={metric} className="border-b">
                                <td className="py-2 px-4 font-medium">{metric}</td>
                                <td className="text-right py-2 px-4 text-muted-foreground">
                                  {formatCurrency(values.baseline)}
                                </td>
                                {comparison.scenarios?.map((s: any) => (
                                  <td key={s.id} className="text-right py-2 px-4">
                                    {formatCurrency(values[s.name] || 0)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No scenarios available for comparison.</p>
                    <p className="text-sm">Create some scenarios first.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Scenarios</CardTitle>
              <CardDescription>
                Review and manage your scenario simulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scenarios?.scenarios?.length ? (
                  scenarios.scenarios.map((scenario) => (
                    <Card key={scenario.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getScenarioTypeIcon(scenario.scenario_type)}</span>
                            <h4 className="font-medium">{scenario.scenario_name}</h4>
                            <Badge variant="outline">
                              {getScenarioTypeLabel(scenario.scenario_type)}
                            </Badge>
                          </div>
                          {scenario.description && (
                            <p className="text-sm text-muted-foreground">{scenario.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(scenario.created_at).toLocaleDateString()}
                            </span>
                            <span>
                              {(scenario.risk_breaches as any[])?.length || 0} risk breaches
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => archiveScenario.mutate(scenario.id)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No scenarios created yet.</p>
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
