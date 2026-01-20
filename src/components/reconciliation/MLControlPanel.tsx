import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Brain, CheckCircle2, Shield, TrendingUp, Users } from "lucide-react";
import { useMLSettings, useUpdateMLSettings } from "@/hooks/useMLReconciliation";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function MLControlPanel() {
  const { data: settings, isLoading, error } = useMLSettings();
  const updateSettings = useUpdateMLSettings();

  const handleToggleML = (enabled: boolean) => {
    updateSettings.mutate({ mlEnabled: enabled });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            ML Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load ML settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle>ML Confidence Prediction</CardTitle>
              </div>
              <Badge variant={settings?.mlEnabled ? "default" : "secondary"}>
                {settings?.mlEnabled ? "Active" : "Disabled"}
              </Badge>
            </div>
            <CardDescription>
              Opt-in machine learning to improve reconciliation confidence predictions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="ml-toggle" className="text-base font-medium">
                  Enable ML-assisted Confidence
                </Label>
                <p className="text-sm text-muted-foreground">
                  ML predicts confidence based on historical patterns
                </p>
              </div>
              <Switch
                id="ml-toggle"
                checked={settings?.mlEnabled || false}
                onCheckedChange={handleToggleML}
                disabled={updateSettings.isPending}
              />
            </div>

            {/* Model Info */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={<Brain className="h-4 w-4" />}
                label="Model Version"
                value={settings?.modelVersion || 'v2.0'}
                tooltip="Current ML model version in use"
              />
              <MetricCard
                icon={<Users className="h-4 w-4" />}
                label="Sample Size (30d)"
                value={settings?.sampleSizeLast30Days?.toString() || '0'}
                tooltip="Number of predictions made in the last 30 days"
              />
              <MetricCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Accuracy (30d)"
                value={settings?.accuracyLast30Days != null ? `${settings.accuracyLast30Days}%` : 'N/A'}
                tooltip="Percentage of high-confidence predictions that were correct"
                status={
                  settings?.accuracyLast30Days != null
                    ? settings.accuracyLast30Days >= 90 ? 'success' : settings.accuracyLast30Days >= 70 ? 'warning' : 'error'
                    : undefined
                }
              />
              <MetricCard
                icon={<Shield className="h-4 w-4" />}
                label="Guardrail Override Rate"
                value={`${settings?.guardrailOverrideRate || 0}%`}
                tooltip="Percentage of guardrail blocks that were manually overridden"
                status={
                  (settings?.guardrailOverrideRate || 0) > 10 ? 'warning' : 'success'
                }
              />
            </div>

            {/* Safety Notice */}
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  ML is Advisory Only
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ML predictions do not affect ledger entries or bypass guardrails. 
                  Human approval and guardrail rules remain the final authority for all reconciliations.
                </p>
              </div>
            </div>

            {/* Explainability Note */}
            {settings?.mlEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
              >
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Explainable Predictions
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Each ML prediction includes feature attribution showing which factors contributed to the confidence score.
                    View these explanations in the reconciliation suggestion panel.
                  </p>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tooltip: string;
  status?: 'success' | 'warning' | 'error';
}

function MetricCard({ icon, label, value, tooltip, status }: MetricCardProps) {
  const statusColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-help">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            {icon}
            <span className="text-xs font-medium">{label}</span>
          </div>
          <p className={`text-xl font-semibold ${status ? statusColors[status] : ''}`}>
            {value}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default MLControlPanel;
