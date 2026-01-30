/**
 * ImportPlanStep - Final step showing the generated import plan
 * 
 * Displays categorized recommendations:
 * - Connect: Data to sync via connectors
 * - Import: Data to upload via Excel templates
 * - Skip: Optional data to configure later
 * - Existing: Data already connected
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Link,
  FileSpreadsheet,
  SkipForward,
  CheckCircle2,
  Download,
  Upload,
  ArrowRight,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ImportPlan, ImportPlanItem } from '@/hooks/useDataAssessment';
import { moduleDisplayInfo, type ModuleKey } from '@/lib/dataRequirementsMap';

interface ImportPlanStepProps {
  moduleKey: ModuleKey;
  importPlan: ImportPlan;
  summary: {
    totalRequirements: number;
    criticalMet: number;
    criticalTotal: number;
    connectCount: number;
    importCount: number;
    skipCount: number;
    existingCount: number;
  };
  recommendations: string[];
  onConnect?: (connectorType: string) => void;
  onImport?: (templateId: string) => void;
}

export function ImportPlanStep({
  moduleKey,
  importPlan,
  summary,
  recommendations,
  onConnect,
  onImport,
}: ImportPlanStepProps) {
  const moduleInfo = moduleDisplayInfo[moduleKey];
  const readinessPercent = summary.totalRequirements > 0
    ? Math.round(((summary.existingCount + summary.connectCount + summary.importCount) / summary.totalRequirements) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2"
        >
          <Sparkles className="h-8 w-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground">
          Kế hoạch Import Dữ liệu
        </h2>
        <p className="text-muted-foreground">
          Dựa trên khảo sát, đây là lộ trình tối ưu cho <span className="font-semibold text-foreground">{moduleInfo.name}</span>
        </p>
      </div>

      {/* Readiness Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Độ sẵn sàng dữ liệu</span>
          <span className="text-2xl font-bold text-primary">{readinessPercent}%</span>
        </div>
        <Progress value={readinessPercent} className="h-2" />
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>✅ Đã có: {summary.existingCount}</span>
          <span>🔗 Cần kết nối: {summary.connectCount}</span>
          <span>📄 Cần import: {summary.importCount}</span>
          <span>⏭️ Để sau: {summary.skipCount}</span>
        </div>
      </motion.div>

      {/* Critical Data Warning */}
      {summary.criticalMet < summary.criticalTotal && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
        >
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Còn {summary.criticalTotal - summary.criticalMet} dữ liệu quan trọng
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
              Hãy hoàn thành các bước dưới đây để {moduleInfo.name} hoạt động đầy đủ
            </p>
          </div>
        </motion.div>
      )}

      {/* Plan Sections */}
      <div className="space-y-4">
        {/* Existing */}
        {importPlan.existing.length > 0 && (
          <PlanSection
            icon={CheckCircle2}
            title="Đã kết nối"
            subtitle="Dữ liệu đang được đồng bộ tự động"
            items={importPlan.existing}
            color="green"
          />
        )}

        {/* Connect */}
        {importPlan.connect.length > 0 && (
          <PlanSection
            icon={Link}
            title="Kết nối tự động"
            subtitle="Đồng bộ dữ liệu từ các nền tảng"
            items={importPlan.connect}
            color="blue"
            actionLabel="Kết nối"
            actionIcon={ArrowRight}
            onAction={onConnect}
          />
        )}

        {/* Import */}
        {importPlan.import.length > 0 && (
          <PlanSection
            icon={FileSpreadsheet}
            title="Import từ Excel"
            subtitle="Tải mẫu và upload dữ liệu"
            items={importPlan.import}
            color="purple"
            actionLabel="Tải mẫu"
            actionIcon={Download}
            secondaryActionLabel="Upload"
            secondaryActionIcon={Upload}
            onAction={onImport}
          />
        )}

        {/* Skip */}
        {importPlan.skip.length > 0 && (
          <PlanSection
            icon={SkipForward}
            title="Để sau"
            subtitle="Dữ liệu không bắt buộc, có thể cấu hình sau"
            items={importPlan.skip}
            color="gray"
            collapsed
          />
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-muted/50 rounded-lg p-4 space-y-2"
        >
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Gợi ý thông minh
          </h4>
          <ul className="space-y-1">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Plan Section Component
// ============================================================

interface PlanSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  items: ImportPlanItem[];
  color: 'green' | 'blue' | 'purple' | 'gray';
  actionLabel?: string;
  actionIcon?: React.ComponentType<{ className?: string }>;
  secondaryActionLabel?: string;
  secondaryActionIcon?: React.ComponentType<{ className?: string }>;
  onAction?: (id: string) => void;
  collapsed?: boolean;
}

const colorClasses = {
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-500',
    badge: 'bg-green-500/20 text-green-700 dark:text-green-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-500',
    badge: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-500',
    badge: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  },
  gray: {
    bg: 'bg-muted/50',
    border: 'border-border',
    icon: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
  },
};

function PlanSection({
  icon: Icon,
  title,
  subtitle,
  items,
  color,
  actionLabel,
  actionIcon: ActionIcon,
  secondaryActionLabel,
  secondaryActionIcon: SecondaryIcon,
  onAction,
  collapsed = false,
}: PlanSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(!collapsed);
  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border overflow-hidden",
        colors.bg,
        colors.border
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.icon)} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Badge className={cn("ml-auto mr-2", colors.badge)}>
          {items.length}
        </Badge>
      </button>

      {/* Items */}
      {isExpanded && items.length > 0 && (
        <div className="border-t border-border/50 divide-y divide-border/50">
          {items.map((item, index) => (
            <motion.div
              key={item.requirementId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 px-4 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {item.displayName}
                </span>
                {item.priority === 'critical' && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    Quan trọng
                  </Badge>
                )}
              </div>
              
              {actionLabel && onAction && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {secondaryActionLabel && SecondaryIcon && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAction(item.templateId || item.connectorType || '')}
                      className="h-7 text-xs"
                    >
                      <SecondaryIcon className="h-3 w-3 mr-1" />
                      {secondaryActionLabel}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction(item.connectorType || item.templateId || '')}
                    className="h-7 text-xs"
                  >
                    {ActionIcon && <ActionIcon className="h-3 w-3 mr-1" />}
                    {actionLabel}
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
