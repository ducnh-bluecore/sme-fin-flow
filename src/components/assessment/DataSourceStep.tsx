/**
 * DataSourceStep - Step 1 of Data Assessment Survey (Enhanced)
 * 
 * Asks user about their current data sources with sub-source selection
 * for specific platforms (Shopee, Lazada, MISA, etc.)
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { dataSourceOptions, type DataSourceOption, type SubSource } from '@/lib/dataRequirementsMap';
import { Checkbox } from '@/components/ui/checkbox';

interface DataSourceStepProps {
  selectedSources: string[];
  selectedSubSources: string[];
  onSourcesChange: (sources: string[]) => void;
  onSubSourcesChange: (subSources: string[]) => void;
}

export function DataSourceStep({ 
  selectedSources, 
  selectedSubSources,
  onSourcesChange, 
  onSubSourcesChange 
}: DataSourceStepProps) {
  const toggleSource = (sourceId: string) => {
    const source = dataSourceOptions.find(s => s.id === sourceId);
    
    if (selectedSources.includes(sourceId)) {
      // Remove source and all its sub-sources
      onSourcesChange(selectedSources.filter(id => id !== sourceId));
      if (source?.subSources) {
        const subSourceIds = source.subSources.map(s => s.id);
        onSubSourcesChange(selectedSubSources.filter(id => !subSourceIds.includes(id)));
      }
    } else {
      onSourcesChange([...selectedSources, sourceId]);
    }
  };

  const toggleSubSource = (sourceId: string, subSourceId: string) => {
    const source = dataSourceOptions.find(s => s.id === sourceId);
    
    if (selectedSubSources.includes(subSourceId)) {
      const newSubSources = selectedSubSources.filter(id => id !== subSourceId);
      onSubSourcesChange(newSubSources);
      
      // If no more sub-sources selected for this source, optionally keep or remove parent
      // For now, keep parent selected
    } else {
      onSubSourcesChange([...selectedSubSources, subSourceId]);
      
      // Auto-select parent if not selected
      if (!selectedSources.includes(sourceId)) {
        onSourcesChange([...selectedSources, sourceId]);
      }
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

      <div className="grid grid-cols-1 gap-4">
        {dataSourceOptions.map((source, index) => (
          <SourceCard
            key={source.id}
            source={source}
            isSelected={selectedSources.includes(source.id)}
            selectedSubSources={selectedSubSources}
            onToggle={() => toggleSource(source.id)}
            onSubSourceToggle={(subId) => toggleSubSource(source.id, subId)}
            index={index}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Chọn tất cả các nguồn dữ liệu và nền tảng cụ thể mà doanh nghiệp đang sử dụng
      </p>
    </div>
  );
}

interface SourceCardProps {
  source: DataSourceOption;
  isSelected: boolean;
  selectedSubSources: string[];
  onToggle: () => void;
  onSubSourceToggle: (subSourceId: string) => void;
  index: number;
}

function SourceCard({ 
  source, 
  isSelected, 
  selectedSubSources,
  onToggle, 
  onSubSourceToggle,
  index 
}: SourceCardProps) {
  // Dynamically get the icon component
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[source.icon] || LucideIcons.HelpCircle;

  const hasSubSources = source.subSources && source.subSources.length > 0;
  const selectedSubCount = source.subSources?.filter(sub => selectedSubSources.includes(sub.id)).length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "rounded-xl border-2 transition-all duration-200 overflow-hidden",
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      {/* Main Source Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-4 p-4 text-left"
      >
        {/* Selection indicator */}
        <div
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all mt-0.5",
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "font-semibold transition-colors",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {source.label}
            </h3>
            {isSelected && hasSubSources && selectedSubCount > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                {selectedSubCount} đã chọn
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {source.description}
          </p>
        </div>

        {/* Expand indicator for sub-sources */}
        {hasSubSources && isSelected && (
          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Sub-sources (expanded when selected) */}
      <AnimatePresence>
        {isSelected && hasSubSources && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="ml-9 pl-4 border-l-2 border-primary/20 space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Chọn nền tảng cụ thể:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {source.subSources?.map(subSource => (
                    <SubSourceItem
                      key={subSource.id}
                      subSource={subSource}
                      isSelected={selectedSubSources.includes(subSource.id)}
                      onToggle={() => onSubSourceToggle(subSource.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface SubSourceItemProps {
  subSource: SubSource;
  isSelected: boolean;
  onToggle: () => void;
}

function SubSourceItem({ subSource, isSelected, onToggle }: SubSourceItemProps) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
        isSelected
          ? "bg-primary/10 text-primary"
          : "bg-muted/50 hover:bg-muted text-foreground"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="h-4 w-4"
      />
      <span className="text-sm font-medium truncate">{subSource.label}</span>
    </label>
  );
}
