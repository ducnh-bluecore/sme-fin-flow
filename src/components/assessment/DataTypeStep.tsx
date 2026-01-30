/**
 * DataTypeStep - Step 2 of Data Assessment Survey
 * 
 * Asks user about available data types (orders, invoices, etc.)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { dataTypeOptions, type DataTypeOption } from '@/lib/dataRequirementsMap';

interface DataTypeStepProps {
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
}

export function DataTypeStep({ selectedTypes, onTypesChange }: DataTypeStepProps) {
  const toggleType = (typeId: string) => {
    // If "none" is selected, clear all others
    if (typeId === 'none') {
      onTypesChange(['none']);
      return;
    }
    
    // If selecting something else, remove "none"
    const filtered = selectedTypes.filter(id => id !== 'none');
    
    if (selectedTypes.includes(typeId)) {
      onTypesChange(filtered.filter(id => id !== typeId));
    } else {
      onTypesChange([...filtered, typeId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Loại dữ liệu sẵn có
        </h2>
        <p className="text-muted-foreground">
          Bạn có sẵn những loại dữ liệu nào? (chọn nhiều)
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {dataTypeOptions.map((type, index) => (
          <TypeCard
            key={type.id}
            type={type}
            isSelected={selectedTypes.includes(type.id)}
            onToggle={() => toggleType(type.id)}
            index={index}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Chọn tất cả loại dữ liệu mà bạn hiện có thể cung cấp
      </p>
    </div>
  );
}

interface TypeCardProps {
  type: DataTypeOption;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}

function TypeCard({ type, isSelected, onToggle, index }: TypeCardProps) {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[type.icon] || LucideIcons.HelpCircle;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      onClick={onToggle}
      className={cn(
        "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
        "hover:border-primary/50 hover:bg-muted/50",
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card"
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center transition-all",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "border border-muted-foreground/30"
        )}
      >
        {isSelected && <Check className="h-2.5 w-2.5" />}
      </div>

      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
          isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <IconComponent className="h-5 w-5" />
      </div>

      {/* Label */}
      <span className={cn(
        "text-sm font-medium text-center transition-colors",
        isSelected ? "text-primary" : "text-foreground"
      )}>
        {type.label}
      </span>
    </motion.button>
  );
}
