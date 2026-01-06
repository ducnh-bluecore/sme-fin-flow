import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDateRange } from '@/contexts/DateRangeContext';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangePreset {
  label: string;
  value: string;
  getRange: () => DateRange;
}

const presets: DateRangePreset[] = [
  {
    label: 'Hôm nay',
    value: 'today',
    getRange: () => ({
      from: new Date(),
      to: new Date(),
    }),
  },
  {
    label: '7 ngày qua',
    value: '7days',
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: '14 ngày qua',
    value: '14days',
    getRange: () => ({
      from: subDays(new Date(), 13),
      to: new Date(),
    }),
  },
  {
    label: '30 ngày qua',
    value: '30days',
    getRange: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: '90 ngày qua',
    value: '90days',
    getRange: () => ({
      from: subDays(new Date(), 89),
      to: new Date(),
    }),
  },
  {
    label: 'Tháng này',
    value: 'this_month',
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: new Date(),
    }),
  },
  {
    label: 'Tháng trước',
    value: 'last_month',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  {
    label: 'Quý này',
    value: 'this_quarter',
    getRange: () => ({
      from: startOfQuarter(new Date()),
      to: new Date(),
    }),
  },
  {
    label: 'Năm nay',
    value: 'this_year',
    getRange: () => ({
      from: startOfYear(new Date()),
      to: new Date(),
    }),
  },
];

interface DateRangeFilterProps {
  value?: DateRange;
  onChange: (range: DateRange, preset?: string) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('30days');
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({
    from: value?.from,
    to: value?.to,
  });
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');

  const handlePresetChange = (presetValue: string) => {
    const preset = presets.find((p) => p.value === presetValue);
    if (preset) {
      setSelectedPreset(presetValue);
      const range = preset.getRange();
      onChange(range, presetValue);
      setIsOpen(false);
    }
  };

  const handleCustomApply = () => {
    if (tempRange.from && tempRange.to) {
      onChange({ from: tempRange.from, to: tempRange.to }, 'custom');
      setSelectedPreset('custom');
      setIsOpen(false);
    }
  };

  const getDisplayText = () => {
    if (selectedPreset === 'custom' && value?.from && value?.to) {
      return `${format(value.from, 'dd/MM/yyyy')} - ${format(value.to, 'dd/MM/yyyy')}`;
    }
    const preset = presets.find((p) => p.value === selectedPreset);
    return preset?.label || '30 ngày qua';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[260px] justify-between text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>{getDisplayText()}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-popover border shadow-lg z-50" align="end">
        <div className="flex">
          {/* Presets */}
          <div className="border-r p-2 space-y-1 min-w-[140px]">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
              Khoảng thời gian
            </p>
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetChange(preset.value)}
                className={cn(
                  'w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors',
                  selectedPreset === preset.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                {preset.label}
              </button>
            ))}
            <div className="border-t my-2" />
            <button
              onClick={() => setMode('custom')}
              className={cn(
                'w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors',
                selectedPreset === 'custom'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              Tùy chỉnh
            </button>
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={{
                from: tempRange.from,
                to: tempRange.to,
              }}
              onSelect={(range) => {
                setTempRange({
                  from: range?.from,
                  to: range?.to,
                });
                setMode('custom');
              }}
              numberOfMonths={2}
              locale={vi}
              className="pointer-events-auto"
              disabled={(date) => date > new Date()}
            />
            {mode === 'custom' && (
              <div className="flex justify-end gap-2 pt-3 border-t mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempRange({ from: value?.from, to: value?.to });
                    setIsOpen(false);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleCustomApply}
                  disabled={!tempRange.from || !tempRange.to}
                >
                  Áp dụng
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Quick preset selector - automatically uses global DateRangeContext when no props provided
interface QuickDateSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  showYears?: boolean;
}

export function QuickDateSelector({ value, onChange, className, showYears = true }: QuickDateSelectorProps) {
  // Use global context if no props provided
  const globalContext = useDateRange();
  
  // Determine if using controlled (props) or context mode
  const isControlled = value !== undefined && onChange !== undefined;
  
  const currentValue = isControlled ? value : globalContext.dateRange;
  
  const handleChange = (newValue: string) => {
    if (isControlled && onChange) {
      onChange(newValue);
    } else {
      globalContext.setDateRange(newValue);
    }
  };

  // Get display label for current value
  const getDisplayLabel = (val: string): string => {
    const labels: Record<string, string> = {
      'today': 'Hôm nay',
      '7': '7 ngày qua',
      '14': '14 ngày qua',
      '30': '30 ngày qua',
      '60': '60 ngày qua',
      '90': '90 ngày qua',
      'this_month': 'Tháng này',
      'last_month': 'Tháng trước',
      'this_quarter': 'Quý này',
      'this_year': 'Năm nay (YTD)',
      'last_year': 'Năm trước',
      '2024': 'Năm 2024',
      '2025': 'Năm 2025',
      '2026': 'Năm 2026',
      'all': 'Tất cả',
      'custom': 'Tùy chỉnh',
    };
    return labels[val] || 'Chọn kỳ';
  };

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className={cn('w-[180px]', className)}>
        <SelectValue placeholder="Chọn kỳ">
          {getDisplayLabel(currentValue)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover border shadow-lg z-50">
        <SelectItem value="today">Hôm nay</SelectItem>
        <SelectItem value="7">7 ngày qua</SelectItem>
        <SelectItem value="14">14 ngày qua</SelectItem>
        <SelectItem value="30">30 ngày qua</SelectItem>
        <SelectItem value="60">60 ngày qua</SelectItem>
        <SelectItem value="90">90 ngày qua</SelectItem>
        <SelectItem value="this_month">Tháng này</SelectItem>
        <SelectItem value="last_month">Tháng trước</SelectItem>
        <SelectItem value="this_quarter">Quý này</SelectItem>
        <SelectItem value="this_year">Năm nay (YTD)</SelectItem>
        <SelectItem value="last_year">Năm trước</SelectItem>
        {showYears && (
          <>
            <SelectItem value="2024">Năm 2024</SelectItem>
            <SelectItem value="2025">Năm 2025</SelectItem>
            <SelectItem value="2026">Năm 2026</SelectItem>
          </>
        )}
        <SelectItem value="all">Tất cả</SelectItem>
      </SelectContent>
    </Select>
  );
}
