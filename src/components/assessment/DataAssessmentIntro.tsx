/**
 * DataAssessmentIntro - Educational intro section for data assessment
 * 
 * Explains the D2C/Retail data mapping concept:
 * - Order = Invoice (AR)
 * - Platform Fees = Bill (AP)
 * - Settlement = Real Cash
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Info, 
  ArrowRight, 
  ShoppingCart, 
  Receipt, 
  Wallet,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { moduleDisplayInfo, type ModuleKey } from '@/lib/dataRequirementsMap';

interface DataAssessmentIntroProps {
  moduleKey: ModuleKey;
  onDismiss: () => void;
  onLearnMore?: () => void;
}

export function DataAssessmentIntro({
  moduleKey,
  onDismiss,
  onLearnMore,
}: DataAssessmentIntroProps) {
  const moduleInfo = moduleDisplayInfo[moduleKey];

  // Only show for FDP module - the finance module
  if (moduleKey !== 'fdp') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative mb-6 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-4"
    >
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
        aria-label="Đóng hướng dẫn"
      >
        <X className="h-4 w-4 text-blue-500" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4 pr-8">
        <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/20">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            Cách FDP xử lý dữ liệu D2C/Retail
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Hệ thống tự động chuyển đổi dữ liệu bán hàng thành thông tin tài chính
          </p>
        </div>
      </div>

      {/* Mapping explanation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MappingCard
          icon={ShoppingCart}
          source="Đơn hàng"
          target="Doanh thu (AR)"
          example="Đơn Shopee 500k → AR 500k"
          color="green"
        />
        <MappingCard
          icon={Receipt}
          source="Phí sàn"
          target="Chi phí (AP)"
          example="Commission 10% → AP 50k"
          color="red"
        />
        <MappingCard
          icon={Wallet}
          source="Đối soát"
          target="Tiền thực (Cash)"
          example="T+14 → Cash 450k"
          color="blue"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-blue-200/50 dark:border-blue-800/50">
        <p className="text-xs text-muted-foreground">
          💡 Chọn nguồn dữ liệu để hệ thống tự động xác định loại dữ liệu tài chính
        </p>
        {onLearnMore && (
          <Button variant="ghost" size="sm" onClick={onLearnMore} className="text-xs">
            Tìm hiểu thêm
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

interface MappingCardProps {
  icon: React.ComponentType<{ className?: string }>;
  source: string;
  target: string;
  example: string;
  color: 'green' | 'red' | 'blue';
}

const colorStyles = {
  green: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400',
  red: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
  blue: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
};

function MappingCard({ icon: Icon, source, target, example, color }: MappingCardProps) {
  return (
    <div className={`rounded-lg border p-3 ${colorStyles[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">
          {source} <ArrowRight className="h-3 w-3 inline mx-1" /> {target}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        VD: {example}
      </p>
    </div>
  );
}
