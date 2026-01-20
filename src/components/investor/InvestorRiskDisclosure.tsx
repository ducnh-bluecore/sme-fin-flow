import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Shield, 
  Download, 
  Send,
  Eye,
  Clock,
  RefreshCw
} from 'lucide-react';
import { 
  useGenerateDisclosure, 
  useDisclosureList, 
  useSaveDisclosure,
  useApproveDisclosure,
  usePublishDisclosure,
  getStatusBadgeColor,
  formatPeriod
} from '@/hooks/useInvestorDisclosure';
import { toast } from 'sonner';

export function InvestorRiskDisclosure() {
  const [selectedPeriod, setSelectedPeriod] = useState('Q1 2026');
  const [activeTab, setActiveTab] = useState('generate');
  
  const { data: generated, isLoading: isGenerating, refetch } = useGenerateDisclosure(selectedPeriod);
  const { data: disclosureList } = useDisclosureList();
  const saveDisclosure = useSaveDisclosure();
  const approveDisclosure = useApproveDisclosure();
  const publishDisclosure = usePublishDisclosure();

  const handleSave = async () => {
    if (!generated) return;
    
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    const periodEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0);
    
    try {
      await saveDisclosure.mutateAsync({
        riskAppetiteVersion: generated.riskAppetiteVersion,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        summary: generated.summary,
        keyRisks: generated.keyRisks,
        mitigations: generated.mitigations,
        complianceStatement: generated.complianceStatement,
      });
      toast.success('Disclosure saved as draft');
    } catch (error) {
      toast.error('Failed to save disclosure');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveDisclosure.mutateAsync(id);
      toast.success('Disclosure approved');
    } catch (error) {
      toast.error('Failed to approve disclosure');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishDisclosure.mutateAsync(id);
      toast.success('Disclosure published');
    } catch (error) {
      toast.error('Failed to publish disclosure');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Investor Risk Disclosure</h2>
          <p className="text-muted-foreground">
            Board-approved risk disclosures for investors and stakeholders
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Shield className="h-3 w-3" />
          Sanitized for External Use
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generate">Generate New</TabsTrigger>
          <TabsTrigger value="history">Disclosure History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Generate Disclosure
                  </CardTitle>
                  <CardDescription>
                    Auto-generate investor-safe risk disclosure from current risk appetite
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1 2026">Q1 2026</SelectItem>
                      <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                      <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isGenerating ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : generated ? (
                <>
                  {/* Summary */}
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      Executive Summary
                      <Badge variant="secondary" className="text-xs">
                        v{generated.riskAppetiteVersion}
                      </Badge>
                    </h4>
                    <Textarea 
                      value={generated.summary} 
                      readOnly 
                      className="min-h-[80px] bg-muted/50"
                    />
                  </div>

                  {/* Key Risks */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Key Risk Metrics</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {generated.keyRisks.map((risk, idx) => (
                        <Card key={idx} className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">{risk.domain}</p>
                              <p className="font-medium">{risk.metric}</p>
                              <p className="text-lg font-bold">{risk.value}</p>
                            </div>
                            {risk.withinAppetite ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Within Appetite
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Attention
                              </Badge>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Mitigations */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Controls & Mitigations</h4>
                    <ul className="space-y-2">
                      {generated.mitigations.map((m, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Compliance Statement */}
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-medium mb-2">Compliance Statement</h4>
                    <p className="text-sm text-muted-foreground">{generated.complianceStatement}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button onClick={handleSave} disabled={saveDisclosure.isPending}>
                      Save as Draft
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active risk appetite configured.</p>
                  <p className="text-sm">Please set up a Board-approved risk appetite first.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disclosure History</CardTitle>
              <CardDescription>
                Track and manage all investor risk disclosures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {disclosureList?.disclosures?.length ? (
                  disclosureList.disclosures.map((disclosure) => (
                    <Card key={disclosure.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">
                              {formatPeriod(
                                disclosure.disclosure_period_start,
                                disclosure.disclosure_period_end
                              )}
                            </span>
                            <Badge className={getStatusBadgeColor(disclosure.status)}>
                              {disclosure.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {disclosure.summary}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(disclosure.created_at).toLocaleDateString()}
                            </span>
                            <span>Risk Appetite v{disclosure.risk_appetite_version}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {disclosure.status === 'draft' && (
                            <Button 
                              size="sm"
                              onClick={() => handleApprove(disclosure.id)}
                              disabled={approveDisclosure.isPending}
                            >
                              Approve
                            </Button>
                          )}
                          {disclosure.status === 'approved' && (
                            <Button 
                              size="sm"
                              onClick={() => handlePublish(disclosure.id)}
                              disabled={publishDisclosure.isPending}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Publish
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No disclosures created yet.</p>
                    <p className="text-sm">Generate your first disclosure above.</p>
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
