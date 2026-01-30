/**
 * CompanyProfilePage - Step 4: Basic company information
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnboardingLayout } from '@/components/onboarding';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useOnboardingStatus, useUpdateTenantOnboarding } from '@/hooks/useOnboardingStatus';
import { useSwitchTenant, useCreateTenant } from '@/hooks/useTenant';

export default function CompanyProfilePage() {
  const queryClient = useQueryClient();
  const { goToNextStep, isUpdating } = useOnboardingFlow();
  const { data: onboardingData } = useOnboardingStatus();
  const updateTenant = useUpdateTenantOnboarding();
  const createTenant = useCreateTenant();
  const switchTenant = useSwitchTenant();

  const [companyName, setCompanyName] = useState(onboardingData?.tenant?.name || '');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const existingTenantName = onboardingData?.tenant?.name || '';
  const isNewCompany = companyName.trim() !== existingTenantName;

  const handleContinue = async () => {
    if (!companyName.trim()) return;

    if (isNewCompany || !onboardingData?.tenant?.id) {
      // Create new tenant when name is different or no tenant exists
      const newTenant = await createTenant.mutateAsync({ name: companyName.trim() });
      if (!newTenant) return;
      
      await switchTenant.mutateAsync(newTenant.id);
      
      // Force refetch onboarding status to ensure tenant data is available for next step
      await queryClient.refetchQueries({ queryKey: ['onboarding-status'] });
    } else {
      // Same tenant name - just update status
      await updateTenant.mutateAsync({
        tenantId: onboardingData.tenant.id,
        data: { onboarding_status: 'in_progress' },
      });
    }

    goToNextStep('company');
  };

  const isLoading = isUpdating || updateTenant.isPending || createTenant.isPending || switchTenant.isPending;

  return (
    <OnboardingLayout
      stepId="company"
      title="Thông tin công ty"
      subtitle="Cho chúng tôi biết về doanh nghiệp của bạn"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto w-full space-y-8"
      >
        {/* Logo upload */}
        <div className="flex flex-col items-center gap-4">
          <Avatar className="w-24 h-24 border-2 border-dashed border-muted-foreground/30">
            {logoUrl ? (
              <AvatarImage src={logoUrl} />
            ) : (
              <AvatarFallback className="bg-muted">
                {companyName ? (
                  <span className="text-2xl font-bold text-muted-foreground">
                    {companyName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </AvatarFallback>
            )}
          </Avatar>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Tải logo lên
          </Button>
          <p className="text-xs text-muted-foreground">PNG, JPG tối đa 2MB</p>
        </div>

        {/* Company name input */}
        <div className="space-y-2">
          <Label htmlFor="company-name">Tên công ty *</Label>
          <Input
            id="company-name"
            placeholder="VD: Công ty ABC"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="text-lg"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Tên này sẽ hiển thị trong báo cáo và dashboard
          </p>
        </div>

        {/* Continue button */}
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!companyName.trim() || isLoading}
          className="w-full gap-2"
        >
          Tiếp tục
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </OnboardingLayout>
  );
}
