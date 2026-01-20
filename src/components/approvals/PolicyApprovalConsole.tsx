import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Shield, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Plus,
  Users,
  FileText,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  usePolicies,
  usePendingApprovals,
  useApprovalHistory,
  useApprovalStats,
  useCreatePolicy,
  useUpdatePolicy,
  useDecideApproval,
  getPolicyTypeLabel,
  formatCondition,
  EnterprisePolicy,
  ApprovalRequest
} from "@/hooks/useApprovals";

export function PolicyApprovalConsole() {
  const [activeTab, setActiveTab] = useState('pending');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [decisionDialog, setDecisionDialog] = useState<{ request: ApprovalRequest; action: 'approve' | 'reject' } | null>(null);
  const [decisionComment, setDecisionComment] = useState('');

  const { data: policies, isLoading: policiesLoading } = usePolicies();
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = usePendingApprovals();
  const { data: history, isLoading: historyLoading } = useApprovalHistory();
  const { data: stats } = useApprovalStats();
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();
  const decideApproval = useDecideApproval();

  const handleDecision = () => {
    if (!decisionDialog) return;
    decideApproval.mutate({
      requestId: decisionDialog.request.id,
      decision: decisionDialog.action,
      comment: decisionComment || undefined,
    }, {
      onSuccess: () => {
        setDecisionDialog(null);
        setDecisionComment('');
      },
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Stats */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Policy & Approval Console</CardTitle>
                    <CardDescription>Enterprise controls and approval workflows</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {stats?.pendingCount ? (
                    <Badge variant="destructive">{stats.pendingCount} Pending</Badge>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => refetchPending()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Pending Approvals" value={stats?.pendingCount || 0} icon={<Clock className="h-4 w-4" />} alert={stats?.pendingCount ? stats.pendingCount > 0 : false} />
          <StatCard label="Approved (30d)" value={stats?.approvedCount30d || 0} icon={<CheckCircle2 className="h-4 w-4" />} />
          <StatCard label="Rejected (30d)" value={stats?.rejectedCount30d || 0} icon={<XCircle className="h-4 w-4" />} />
          <StatCard label="Active Policies" value={`${stats?.activePolicies || 0}/${stats?.totalPolicies || 0}`} icon={<Shield className="h-4 w-4" />} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              Pending Approvals
              {stats?.pendingCount ? (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {stats.pendingCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Pending Approvals */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Approval Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : !pendingData?.requests?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-4 text-green-500" />
                    <p>No pending approvals</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      <AnimatePresence>
                        {pendingData.requests.map((request, idx) => (
                          <motion.div
                            key={request.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center justify-between p-4 border rounded-lg bg-card"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{request.policy?.policy_type}</Badge>
                                <span className="font-medium">{request.policy?.policy_name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {request.action} on {request.resource_type}
                                {request.resource_data?.amount && (
                                  <span className="font-medium ml-1">
                                    ({Number(request.resource_data.amount).toLocaleString()} VND)
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span><Clock className="h-3 w-3 inline mr-1" />{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                                <span><Users className="h-3 w-3 inline mr-1" />{request.current_approvals}/{request.required_approvals} approvals</span>
                              </div>
                            </div>
                            {pendingData.canApprove && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDecisionDialog({ request, action: 'reject' })}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setDecisionDialog({ request, action: 'approve' })}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies */}
          <TabsContent value="policies" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Enterprise Policies</CardTitle>
                  <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Policy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {policiesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {policies?.map((policy) => (
                      <PolicyCard 
                        key={policy.id} 
                        policy={policy} 
                        onToggle={(enabled) => updatePolicy.mutate({ id: policy.id, enabled })}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approval History</CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : !history?.length ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 mr-2" />
                    No approval history
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {history.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={request.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {request.status === 'approved' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                {request.status}
                              </Badge>
                              <span className="text-sm font-medium">{request.policy?.policy_name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {request.action} • {request.resource_type}
                            </p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            {request.resolved_at && formatDistanceToNow(new Date(request.resolved_at), { addSuffix: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Decision Dialog */}
        <Dialog open={!!decisionDialog} onOpenChange={() => setDecisionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {decisionDialog?.action === 'approve' ? 'Approve Request' : 'Reject Request'}
              </DialogTitle>
              <DialogDescription>
                {decisionDialog?.request.policy?.policy_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Action:</strong> {decisionDialog?.request.action}</p>
                <p><strong>Resource:</strong> {decisionDialog?.request.resource_type}</p>
                {decisionDialog?.request.resource_data?.amount && (
                  <p><strong>Amount:</strong> {Number(decisionDialog.request.resource_data.amount).toLocaleString()} VND</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Comment (optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Add a comment..."
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDecisionDialog(null)}>Cancel</Button>
              <Button
                onClick={handleDecision}
                disabled={decideApproval.isPending}
                className={decisionDialog?.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {decideApproval.isPending ? 'Processing...' : decisionDialog?.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Policy Dialog */}
        <CreatePolicyDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
          onCreate={(policy) => {
            createPolicy.mutate(policy, {
              onSuccess: () => setShowCreateDialog(false),
            });
          }}
          isLoading={createPolicy.isPending}
        />
      </div>
    </TooltipProvider>
  );
}

function StatCard({ label, value, icon, alert }: { label: string; value: number | string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <Card className={alert ? 'border-red-300 dark:border-red-800' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${alert ? 'text-red-600' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function PolicyCard({ policy, onToggle }: { policy: EnterprisePolicy; onToggle: (enabled: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline">{getPolicyTypeLabel(policy.policy_type)}</Badge>
          <span className="font-medium">{policy.policy_name}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatCondition(policy.condition)} • {policy.required_approvals} approval(s) required
        </p>
        <div className="flex items-center gap-2 mt-1">
          {policy.approver_roles.map(role => (
            <Badge key={role} variant="secondary" className="text-xs">{role}</Badge>
          ))}
        </div>
      </div>
      <Switch checked={policy.enabled} onCheckedChange={onToggle} />
    </div>
  );
}

function CreatePolicyDialog({ open, onOpenChange, onCreate, isLoading }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (policy: any) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    policyName: '',
    policyType: 'AUTO_RECONCILIATION',
    conditionType: 'amount_gt',
    conditionValue: '',
    requiredApprovals: 1,
  });

  const handleCreate = () => {
    const condition: Record<string, unknown> = {};
    if (form.conditionType === 'always') {
      condition.always = true;
    } else if (form.conditionValue) {
      condition[form.conditionType] = form.conditionType.includes('amount') 
        ? Number(form.conditionValue) 
        : form.conditionValue;
    }

    onCreate({
      policyName: form.policyName,
      policyType: form.policyType,
      condition,
      requiredApprovals: form.requiredApprovals,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Policy</DialogTitle>
          <DialogDescription>Define an approval policy for sensitive actions</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Policy Name</Label>
            <Input
              value={form.policyName}
              onChange={(e) => setForm({ ...form, policyName: e.target.value })}
              placeholder="e.g., Large Transaction Review"
            />
          </div>
          <div className="space-y-2">
            <Label>Policy Type</Label>
            <Select value={form.policyType} onValueChange={(v) => setForm({ ...form, policyType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO_RECONCILIATION">Auto-Reconciliation</SelectItem>
                <SelectItem value="MANUAL_RECONCILIATION">Manual Reconciliation</SelectItem>
                <SelectItem value="VOID_RECONCILIATION">Void Reconciliation</SelectItem>
                <SelectItem value="ML_ENABLEMENT">ML Enablement</SelectItem>
                <SelectItem value="LARGE_PAYMENT">Large Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={form.conditionType} onValueChange={(v) => setForm({ ...form, conditionType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount_gt">Amount Greater Than</SelectItem>
                  <SelectItem value="amount_gte">Amount Greater or Equal</SelectItem>
                  <SelectItem value="confidence_lt">Confidence Less Than</SelectItem>
                  <SelectItem value="always">Always Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.conditionType !== 'always' && (
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={form.conditionValue}
                  onChange={(e) => setForm({ ...form, conditionValue: e.target.value })}
                  placeholder={form.conditionType.includes('amount') ? '100000000' : '70'}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Required Approvals</Label>
            <Select value={String(form.requiredApprovals)} onValueChange={(v) => setForm({ ...form, requiredApprovals: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Approval</SelectItem>
                <SelectItem value="2">2 Approvals</SelectItem>
                <SelectItem value="3">3 Approvals</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isLoading || !form.policyName}>
            {isLoading ? 'Creating...' : 'Create Policy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PolicyApprovalConsole;
