/**
 * DataConfirmStep - Step 2 of Data Assessment Survey
 * 
 * Shows auto-inferred data types from selected sources
 * and allows adding additional data types (for Excel/Manual sources)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, Info } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  inferDataTypesFromSources,
  needsAdditionalDataTypeQuestion,
  dataTypeOptions,
  getDataTypeDisplayName,
  type InferredDataGroup,
} from '@/lib/dataRequirementsMap';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DataConfirmStepProps {
  selectedSources: string[];
  selectedSubSources: string[];
  additionalDataTypes: string[];
  onAdditionalTypesChange: (types: string[]) => void;
}

export function DataConfirmStep({
  selectedSources,
  selectedSubSources,
  additionalDataTypes,
  onAdditionalTypesChange,
}: DataConfirmStepProps) {
  // Infer data types from selected sources
  const inferredGroups = inferDataTypesFromSources(selectedSources, selectedSubSources);
  const needsAdditional = needsAdditionalDataTypeQuestion(selectedSources);
  
  // Get all inferred types to exclude from additional options
  const allInferredTypes = new Set<string>();
  inferredGroups.forEach(group => {
    group.dataTypes.forEach(type => allInferredTypes.add(type));
  });
  
  // Available additional types (exclude already inferred)
  const availableAdditionalTypes = dataTypeOptions.filter(
    option => !allInferredTypes.has(option.id)
  );

  const toggleAdditionalType = (typeId: string) => {
    if (additionalDataTypes.includes(typeId)) {
      onAdditionalTypesChange(additionalDataTypes.filter(id => id !== typeId));
    } else {
      onAdditionalTypesChange([...additionalDataTypes, typeId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Xác nhận dữ liệu
        </h2>
        <p className="text-muted-foreground">
          Dựa trên nguồn bạn chọn, hệ thống xác định bạn có những dữ liệu sau
        </p>
      </div>

      {/* Inferred Data Groups */}
      {inferredGroups.length > 0 ? (
        <div className="space-y-4">
          {inferredGroups.map((group, index) => (
            <InferredDataCard key={`${group.sourceId}-${index}`} group={group} index={index} />
          ))}
        </div>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Chưa thể xác định dữ liệu tự động từ nguồn bạn chọn. 
            Vui lòng chọn loại dữ liệu bên dưới.
          </AlertDescription>
        </Alert>
      )}

      {/* Additional Data Types Section */}
      {(needsAdditional || inferredGroups.length === 0) && availableAdditionalTypes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">
              Bạn còn dữ liệu nào khác? <span className="text-xs">(chọn thêm nếu có)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableAdditionalTypes.map((option) => (
              <AdditionalTypeCard
                key={option.id}
                option={option}
                isSelected={additionalDataTypes.includes(option.id)}
                onToggle={() => toggleAdditionalType(option.id)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {allInferredTypes.size + additionalDataTypes.length}
          </span>{' '}
          loại dữ liệu sẽ được phân tích trong bước tiếp theo
        </p>
      </div>
    </div>
  );
}

interface InferredDataCardProps {
  group: InferredDataGroup;
  index: number;
}

function InferredDataCard({ group, index }: InferredDataCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Check className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground">
            Từ {group.source}
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.dataTypes.map(dataType => (
              <span
                key={dataType}
                className="inline-flex items-center px-2.5 py-1 rounded-md bg-background border border-border text-sm"
              >
                {getDataTypeDisplayName(dataType)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface AdditionalTypeCardProps {
  option: typeof dataTypeOptions[0];
  isSelected: boolean;
  onToggle: () => void;
}

function AdditionalTypeCard({ option, isSelected, onToggle }: AdditionalTypeCardProps) {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[option.icon] || LucideIcons.HelpCircle;

  return (
    <label
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="h-4 w-4"
      />
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
      )}>
        <IconComponent className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn(
          "font-medium text-sm",
          isSelected ? "text-primary" : "text-foreground"
        )}>
          {option.label}
        </span>
        <p className="text-xs text-muted-foreground truncate">
          (từ Excel)
        </p>
      </div>
    </label>
  );
}
