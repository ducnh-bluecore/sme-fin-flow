/**
 * DataSourcesOverviewPage - Step 7: High-level data sources selection
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ShoppingCart, CreditCard, BarChart3, FileSpreadsheet, Calculator, Boxes, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingLayout } from '@/components/onboarding';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useOnboardingStatus, useUpdateTenantOnboarding, useUpdateProfileOnboarding } from '@/hooks/useOnboardingStatus';
import { cn } from '@/lib/utils';

interface DataSourceOption {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  examples: string[];
}

const DATA_SOURCES: DataSourceOption[] = [
  {
    id: 'ecommerce',
    label: 'Sàn TMĐT / E-commerce',
    description: 'Đơn hàng, khách hàng từ các sàn',
    icon: ShoppingCart,
    color: 'violet',
    examples: ['Shopee', 'Lazada', 'Tiki', 'TikTok Shop'],
  },
  {
    id: 'pos',
    label: 'POS / Bán hàng',
    description: 'Hệ thống quản lý bán hàng',
    icon: CreditCard,
    color: 'emerald',
    examples: ['Sapo', 'KiotViet', 'Haravan', 'Nhanh.vn'],
  },
  {
    id: 'ads',
    label: 'Quảng cáo / Marketing',
    description: 'Chi phí và hiệu quả quảng cáo',
    icon: BarChart3,
    color: 'pink',
    examples: ['Facebook Ads', 'Google Ads', 'TikTok Ads'],
  },
  {
    id: 'accounting',
    label: 'Kế toán / ERP',
    description: 'Số liệu tài chính, sổ sách',
    icon: Calculator,
    color: 'blue',
    examples: ['MISA', 'Fast', 'SAP', 'Bravo'],
  },
  {
    id: 'excel',
    label: 'Excel / Google Sheets',
    description: 'File dữ liệu thủ công',
    icon: FileSpreadsheet,
    color: 'amber',
    examples: ['Báo cáo nội bộ', 'Dữ liệu lịch sử'],
  },
  {
    id: 'inventory',
    label: 'Kho / Tồn kho',
    description: 'Quản lý hàng hóa, nhập xuất',
    icon: Boxes,
    color: 'cyan',
    examples: ['WMS', 'Kho riêng', 'Fulfillment'],
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/30' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/30' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
};

export default function DataSourcesOverviewPage() {
  const { goToNextStep, isUpdating } = useOnboardingFlow();
  const { data: onboardingData, isLoading: isLoadingOnboarding } = useOnboardingStatus();
  const updateTenant = useUpdateTenantOnboarding();
  const updateProfile = useUpdateProfileOnboarding();

  const [selectedSources, setSelectedSources] = useState<string[]>(
    onboardingData?.tenant?.data_sources || []
  );

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleComplete = async () => {
    if (!onboardingData?.tenant?.id) return;

    // Save data sources and mark onboarding complete
    await updateTenant.mutateAsync({
      tenantId: onboardingData.tenant.id,
      data: {
        data_sources: selectedSources,
        onboarding_status: 'completed',
      },
    });

    await updateProfile.mutateAsync({
      onboarding_status: 'completed',
      onboarding_completed_at: new Date().toISOString(),
    });

    // Go to portal
    goToNextStep('sources');
  };

  const isLoading = isUpdating || updateTenant.isPending || updateProfile.isPending;

  // Show loading while fetching tenant data
  if (isLoadingOnboarding) {
    return (
      <OnboardingLayout stepId="sources" title="Đang tải..." showBack={false} showSkip={false}>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      stepId="sources"
      title="Bạn đang dùng những nguồn dữ liệu nào?"
      subtitle="Chọn tất cả nguồn dữ liệu bạn muốn kết nối (có thể thêm sau)"
    >
      {/* Data sources grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {DATA_SOURCES.map((source, index) => {
          const colors = colorMap[source.color];
          const isSelected = selectedSources.includes(source.id);
          const Icon = source.icon;

          return (
            <motion.button
              key={source.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleSource(source.id)}
              className={cn(
                'relative p-5 rounded-xl border-2 text-left transition-all hover:shadow-md',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isSelected
                  ? `${colors.border} ${colors.bg}`
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    'absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center',
                    colors.bg, colors.text
                  )}
                >
                  <Check className="h-4 w-4" />
                </motion.div>
              )}

              {/* Icon */}
              <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center mb-3',
                colors.bg, colors.text
              )}>
                <Icon className="h-6 w-6" />
              </div>

              {/* Content */}
              <h3 className="font-semibold text-lg mb-1">{source.label}</h3>
              <p className="text-sm text-muted-foreground mb-2">{source.description}</p>

              {/* Examples */}
              <div className="flex flex-wrap gap-1">
                {source.examples.slice(0, 3).map((example) => (
                  <span
                    key={example}
                    className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                  >
                    {example}
                  </span>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Summary and complete */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        {selectedSources.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Đã chọn {selectedSources.length} nguồn dữ liệu
          </p>
        )}
        
        <Button
          size="lg"
          onClick={handleComplete}
          disabled={isLoading}
          className="gap-2 px-8"
        >
          Hoàn tất & Vào Portal
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-xs text-muted-foreground">
          Bạn có thể bỏ qua và thêm nguồn dữ liệu sau
        </p>
      </motion.div>
    </OnboardingLayout>
  );
}
