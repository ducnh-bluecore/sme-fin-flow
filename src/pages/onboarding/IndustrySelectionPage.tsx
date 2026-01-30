/**
 * IndustrySelectionPage - Step 5: Select company industry
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingLayout } from '@/components/onboarding';
import { IndustryCard } from '@/components/onboarding/IndustryCard';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useOnboardingStatus, useUpdateTenantOnboarding } from '@/hooks/useOnboardingStatus';
import { INDUSTRIES, type Industry } from '@/lib/onboardingConfig';

export default function IndustrySelectionPage() {
  const { goToNextStep, isUpdating } = useOnboardingFlow();
  const { data: onboardingData, isLoading: isLoadingOnboarding } = useOnboardingStatus();
  const updateTenant = useUpdateTenantOnboarding();

  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(
    onboardingData?.tenant?.industry || null
  );

  const handleContinue = async () => {
    if (!selectedIndustry || !onboardingData?.tenant?.id) return;

    await updateTenant.mutateAsync({
      tenantId: onboardingData.tenant.id,
      data: { industry: selectedIndustry },
    });

    goToNextStep('industry');
  };

  const isLoading = isUpdating || updateTenant.isPending;

  // Show loading while fetching tenant data
  if (isLoadingOnboarding) {
    return (
      <OnboardingLayout stepId="industry" title="Đang tải..." showBack={false} showSkip={false}>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      stepId="industry"
      title="Ngành nghề của bạn?"
      subtitle="Giúp chúng tôi đề xuất cấu hình phù hợp nhất"
    >
      {/* Industry grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {INDUSTRIES.map((industry, index) => (
          <IndustryCard
            key={industry.id}
            industry={industry}
            isSelected={selectedIndustry === industry.id}
            onClick={() => setSelectedIndustry(industry.id)}
            index={index}
          />
        ))}
      </div>

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
          disabled={!selectedIndustry || isLoading}
          className="gap-2 px-8"
        >
          Tiếp tục
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </OnboardingLayout>
  );
}
