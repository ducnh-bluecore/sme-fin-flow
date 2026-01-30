/**
 * RoleSelectionPage - Step 2: Select user role for personalization
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingLayout, RoleCard } from '@/components/onboarding';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useUpdateProfileOnboarding } from '@/hooks/useOnboardingStatus';
import { ROLES, type UserRole } from '@/lib/onboardingConfig';

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { goToNextStep, isUpdating } = useOnboardingFlow();
  const updateProfile = useUpdateProfileOnboarding();

  const handleContinue = async () => {
    if (!selectedRole) return;
    
    // Save role to profile
    await updateProfile.mutateAsync({ user_role: selectedRole });
    
    // Go to next step
    goToNextStep('role');
  };

  return (
    <OnboardingLayout
      stepId="role"
      title="Bạn là ai trong doanh nghiệp?"
      subtitle="Chọn vai trò để Bluecore cá nhân hóa trải nghiệm cho bạn"
    >
      {/* Role grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {ROLES.map((role, index) => (
          <RoleCard
            key={role.id}
            role={role}
            isSelected={selectedRole === role.id}
            onClick={() => setSelectedRole(role.id)}
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
          disabled={!selectedRole || isUpdating || updateProfile.isPending}
          className="gap-2 px-8"
        >
          Tiếp tục
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </OnboardingLayout>
  );
}
