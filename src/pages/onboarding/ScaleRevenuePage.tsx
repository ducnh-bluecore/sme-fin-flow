/**
 * ScaleRevenuePage - Step 6: Company scale and monthly revenue
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OnboardingLayout } from '@/components/onboarding';
import { ScaleSlider } from '@/components/onboarding/ScaleSlider';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useOnboardingStatus, useUpdateTenantOnboarding } from '@/hooks/useOnboardingStatus';
import { REVENUE_RANGES, type CompanyScale } from '@/lib/onboardingConfig';

export default function ScaleRevenuePage() {
  const { goToNextStep, isUpdating } = useOnboardingFlow();
  const { data: onboardingData, isLoading: isLoadingOnboarding } = useOnboardingStatus();
  const updateTenant = useUpdateTenantOnboarding();

  const [selectedScale, setSelectedScale] = useState<CompanyScale | null>(
    onboardingData?.tenant?.company_scale || null
  );
  const [selectedRevenue, setSelectedRevenue] = useState<string>(
    onboardingData?.tenant?.monthly_revenue_range || ''
  );

  const handleContinue = async () => {
    if (!selectedScale || !onboardingData?.tenant?.id) return;

    await updateTenant.mutateAsync({
      tenantId: onboardingData.tenant.id,
      data: {
        company_scale: selectedScale,
        monthly_revenue_range: selectedRevenue || null,
      },
    });

    goToNextStep('scale');
  };

  const isLoading = isUpdating || updateTenant.isPending;

  // Show loading while fetching tenant data
  if (isLoadingOnboarding) {
    return (
      <OnboardingLayout stepId="scale" title="Đang tải..." showBack={false} showSkip={false}>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      stepId="scale"
      title="Quy mô doanh nghiệp"
      subtitle="Giúp chúng tôi đề xuất giải pháp phù hợp"
    >
      <div className="space-y-8">
        {/* Scale selection */}
        <div className="space-y-4">
          <Label className="text-base">Chọn quy mô *</Label>
          <ScaleSlider value={selectedScale} onChange={setSelectedScale} />
        </div>

        {/* Revenue selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2 max-w-md mx-auto"
        >
          <Label htmlFor="revenue">Doanh thu hàng tháng (tùy chọn)</Label>
          <Select value={selectedRevenue} onValueChange={setSelectedRevenue}>
            <SelectTrigger id="revenue">
              <SelectValue placeholder="Chọn khoảng doanh thu" />
            </SelectTrigger>
            <SelectContent>
              {REVENUE_RANGES.map((range) => (
                <SelectItem key={range.id} value={range.id}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Thông tin này giúp chúng tôi đề xuất benchmark phù hợp
          </p>
        </motion.div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center"
        >
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selectedScale || isLoading}
            className="gap-2 px-8"
          >
            Tiếp tục
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </OnboardingLayout>
  );
}
