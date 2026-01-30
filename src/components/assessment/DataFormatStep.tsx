/**
 * DataFormatStep - Step 3 of Data Assessment Survey
 * 
 * Asks user about their data format preferences (API, Excel, manual)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, FileSpreadsheet, Edit3, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dataFormatOptions } from '@/lib/dataRequirementsMap';

interface DataFormatStepProps {
  selectedFormat: string;
  onFormatChange: (format: string) => void;
}

const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  api: Cloud,
  excel: FileSpreadsheet,
  manual: Edit3,
  mixed: Layers,
};

export function DataFormatStep({ selectedFormat, onFormatChange }: DataFormatStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Định dạng dữ liệu
        </h2>
        <p className="text-muted-foreground">
          Dữ liệu của bạn đang ở định dạng nào?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {dataFormatOptions.map((format, index) => {
          const IconComponent = formatIcons[format.id] || Layers;
          const isSelected = selectedFormat === format.id;

          return (
            <motion.button
              key={format.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onFormatChange(format.id)}
              className={cn(
                "relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left",
                "hover:border-primary/50 hover:bg-muted/50",
                isSelected
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card"
              )}
            >
              {/* Radio indicator */}
              <div
                className={cn(
                  "absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected ? "border-primary" : "border-muted-foreground/30"
                )}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-3 h-3 rounded-full bg-primary"
                  />
                )}
              </div>

              {/* Icon */}
              <div
                className={cn(
                  "flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
                  isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                <IconComponent className="h-7 w-7" />
              </div>

              {/* Content */}
              <div className="flex-1 pr-8">
                <h3 className={cn(
                  "font-semibold text-lg transition-colors",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {format.label}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {format.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Thông tin này giúp chúng tôi đề xuất phương thức import phù hợp nhất
        </p>
      </div>
    </div>
  );
}
