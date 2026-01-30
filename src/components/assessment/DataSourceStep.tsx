/**
 * DataSourceStep - Step 1 of Data Assessment Survey
 * 
 * Asks user about their current data sources (Shopee, ERP, Excel, etc.)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { dataSourceOptions, type DataSourceOption } from '@/lib/dataRequirementsMap';

interface DataSourceStepProps {
  selectedSources: string[];
  onSourcesChange: (sources: string[]) => void;
}

export function DataSourceStep({ selectedSources, onSourcesChange }: DataSourceStepProps) {
  const toggleSource = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      onSourcesChange(selectedSources.filter(id => id !== sourceId));
    } else {
      onSourcesChange([...selectedSources, sourceId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Nguồn dữ liệu hiện tại
        </h2>
        <p className="text-muted-foreground">
          Doanh nghiệp bạn đang sử dụng những nguồn dữ liệu nào?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dataSourceOptions.map((source, index) => (
          <SourceCard
            key={source.id}
            source={source}
            isSelected={selectedSources.includes(source.id)}
            onToggle={() => toggleSource(source.id)}
            index={index}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Chọn tất cả các nguồn dữ liệu mà doanh nghiệp đang sử dụng
      </p>
    </div>
  );
}

interface SourceCardProps {
  source: DataSourceOption;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}

function SourceCard({ source, isSelected, onToggle, index }: SourceCardProps) {
  // Dynamically get the icon component
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[source.icon] || LucideIcons.HelpCircle;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onToggle}
      className={cn(
        "relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left w-full",
        "hover:border-primary/50 hover:bg-muted/50",
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card"
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "border-2 border-muted-foreground/30"
        )}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </div>

      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
          isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <IconComponent className="h-6 w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-6">
        <h3 className={cn(
          "font-semibold transition-colors",
          isSelected ? "text-primary" : "text-foreground"
        )}>
          {source.label}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {source.description}
        </p>
      </div>
    </motion.button>
  );
}
