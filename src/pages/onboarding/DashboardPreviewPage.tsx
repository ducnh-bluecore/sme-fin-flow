/**
 * DashboardPreviewPage - Step 3: Show personalized dashboard preview based on role
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, LayoutDashboard, TrendingUp, Bell, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingLayout } from '@/components/onboarding';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { getRoleById } from '@/lib/onboardingConfig';

// Mock preview data based on role
const rolePreviewData: Record<string, { metrics: Array<{ label: string; value: string; trend: string }>; features: string[] }> = {
  ceo: {
    metrics: [
      { label: 'Doanh thu tháng', value: '2.5 tỷ', trend: '+12%' },
      { label: 'Cash Position', value: '890 triệu', trend: '+5%' },
      { label: 'Margin', value: '18.5%', trend: '-2%' },
    ],
    features: ['Tổng quan doanh nghiệp', 'Control Tower Alerts', 'Scenario Planning'],
  },
  cfo: {
    metrics: [
      { label: 'Net Revenue', value: '2.1 tỷ', trend: '+8%' },
      { label: 'AR Outstanding', value: '450 triệu', trend: '-3%' },
      { label: 'AP Due', value: '280 triệu', trend: '+2%' },
    ],
    features: ['Financial Dashboard', 'Cash Flow Analysis', 'AP/AR Management'],
  },
  cmo: {
    metrics: [
      { label: 'Marketing Spend', value: '320 triệu', trend: '+15%' },
      { label: 'ROAS', value: '3.2x', trend: '+0.4' },
      { label: 'CAC', value: '85k', trend: '-5%' },
    ],
    features: ['Marketing ROI', 'Channel Performance', 'Customer Insights'],
  },
  coo: {
    metrics: [
      { label: 'Orders/Day', value: '1,250', trend: '+8%' },
      { label: 'Fulfillment Rate', value: '94%', trend: '+2%' },
      { label: 'Return Rate', value: '4.2%', trend: '-0.5%' },
    ],
    features: ['Operations Dashboard', 'Inventory Alerts', 'Process Metrics'],
  },
  marketer: {
    metrics: [
      { label: 'Ad Spend Today', value: '12.5 triệu', trend: '+3%' },
      { label: 'Conversions', value: '245', trend: '+18%' },
      { label: 'CPC', value: '2,100đ', trend: '-8%' },
    ],
    features: ['Campaign Analytics', 'A/B Testing', 'Attribution'],
  },
  accountant: {
    metrics: [
      { label: 'Invoices Pending', value: '45', trend: '-5' },
      { label: 'Bills Due', value: '23', trend: '+2' },
      { label: 'Reconciled', value: '98%', trend: '+1%' },
    ],
    features: ['Transaction Matching', 'Reconciliation', 'Financial Reports'],
  },
};

export default function DashboardPreviewPage() {
  const { goToNextStep, isUpdating } = useOnboardingFlow();
  const { data: onboardingData } = useOnboardingStatus();
  
  const userRole = onboardingData?.profile?.user_role || 'ceo';
  const roleConfig = getRoleById(userRole);
  const previewData = rolePreviewData[userRole] || rolePreviewData.ceo;

  return (
    <OnboardingLayout
      stepId="preview"
      title={`Dashboard cho ${roleConfig?.label || 'bạn'}`}
      subtitle="Đây là những gì bạn sẽ thấy khi sử dụng Bluecore"
    >
      {/* Preview Dashboard Mock */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="rounded-xl border bg-card shadow-lg overflow-hidden mb-8"
      >
        {/* Mock header */}
        <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-background rounded px-4 py-1 text-xs text-muted-foreground">
              bluecore.app/dashboard
            </div>
          </div>
        </div>

        {/* Mock dashboard content */}
        <div className="p-6">
          {/* Metrics row */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            {previewData.metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{metric.value}</span>
                      <span className={`text-sm ${
                        metric.trend.startsWith('+') ? 'text-emerald-500' : 
                        metric.trend.startsWith('-') ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        {metric.trend}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Features preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap gap-2"
          >
            {previewData.features.map((feature, index) => {
              const icons = [LayoutDashboard, TrendingUp, Bell, Users];
              const Icon = icons[index % icons.length];
              return (
                <div
                  key={feature}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {feature}
                </div>
              );
            })}
          </motion.div>
        </div>
      </motion.div>

      {/* Continue button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex justify-center"
      >
        <Button
          size="lg"
          onClick={() => goToNextStep('preview')}
          disabled={isUpdating}
          className="gap-2 px-8"
        >
          Thiết lập công ty
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </OnboardingLayout>
  );
}
