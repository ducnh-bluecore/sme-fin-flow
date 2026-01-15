import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign,
  TrendingUp,
  Package,
  FileText,
  Settings,
  Users,
  Shield,
  AlertTriangle,
  RotateCcw,
  Save,
  Info,
} from 'lucide-react';
import {
  useDecisionThresholds,
  useSaveDecisionThresholds,
  useResetDecisionThresholds,
  DEFAULT_THRESHOLDS,
  THRESHOLD_CATEGORIES,
  THRESHOLD_METADATA,
  DecisionThresholdConfig,
} from '@/hooks/useDecisionThresholds';
import { cn } from '@/lib/utils';

interface ThresholdConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Icon mapping
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign,
  TrendingUp,
  Package,
  FileText,
  Settings,
  Users,
  Shield,
};

// Format currency for display
function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toString();
}

export function ThresholdConfigDialog({ open, onOpenChange }: ThresholdConfigDialogProps) {
  const { data: savedConfig, isLoading } = useDecisionThresholds();
  const saveThresholds = useSaveDecisionThresholds();
  const resetThresholds = useResetDecisionThresholds();
  
  const [localConfig, setLocalConfig] = useState<Partial<DecisionThresholdConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof typeof THRESHOLD_CATEGORIES>('financial');

  // Initialize local config when dialog opens or data loads
  useEffect(() => {
    if (open) {
      setLocalConfig(savedConfig || DEFAULT_THRESHOLDS);
      setHasChanges(false);
    }
  }, [open, savedConfig]);

  // Handle value change
  const handleValueChange = (key: string, value: number) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Handle save
  const handleSave = async () => {
    await saveThresholds.mutateAsync(localConfig);
    setHasChanges(false);
    onOpenChange(false);
  };

  // Handle reset
  const handleReset = async () => {
    await resetThresholds.mutateAsync();
    setLocalConfig(DEFAULT_THRESHOLDS);
    setHasChanges(false);
  };

  // Get current value for a threshold
  const getValue = (key: string): number => {
    return (localConfig as Record<string, number>)[key] ?? (DEFAULT_THRESHOLDS as Record<string, number>)[key] ?? 0;
  };

  // Check if value differs from default
  const isDifferentFromDefault = (key: string): boolean => {
    const current = getValue(key);
    const defaultVal = (DEFAULT_THRESHOLDS as Record<string, number>)[key];
    return current !== defaultVal;
  };

  // Render threshold input
  const renderThresholdInput = (key: string) => {
    const meta = THRESHOLD_METADATA[key];
    if (!meta) return null;

    const value = getValue(key);
    const isModified = isDifferentFromDefault(key);
    const defaultVal = (DEFAULT_THRESHOLDS as Record<string, number>)[key];

    // Special handling for currency fields
    const isCurrency = meta.unit === 'VND';

    return (
      <div key={key} className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label className="font-medium">{meta.label}</Label>
              {isModified && (
                <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                  Đã sửa
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {isCurrency ? formatCurrency(value) : value}
              <span className="text-sm font-normal text-muted-foreground ml-1">{meta.unit}</span>
            </div>
            {isModified && (
              <p className="text-xs text-muted-foreground">
                Mặc định: {isCurrency ? formatCurrency(defaultVal) : defaultVal}{meta.unit}
              </p>
            )}
          </div>
        </div>

        {isCurrency ? (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(key, Number(e.target.value))}
            min={meta.min}
            max={meta.max}
            step={meta.step}
            className="w-full"
          />
        ) : (
          <Slider
            value={[value]}
            onValueChange={([v]) => handleValueChange(key, v)}
            min={meta.min}
            max={meta.max}
            step={meta.step}
            className="w-full"
          />
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Cấu hình ngưỡng khẩn cấp
          </DialogTitle>
          <DialogDescription>
            Tùy chỉnh các ngưỡng để xác định mức độ khẩn cấp của quyết định trong Decision Center
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Các ngưỡng này quyết định khi nào một chỉ số được đánh giá là <span className="text-red-500 font-medium">khẩn cấp</span>, 
                <span className="text-yellow-500 font-medium"> cảnh báo</span>, hoặc <span className="text-green-500 font-medium">tốt</span>.
              </AlertDescription>
            </Alert>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as keyof typeof THRESHOLD_CATEGORIES)}>
              <TabsList className="grid grid-cols-7 w-full">
                {Object.entries(THRESHOLD_CATEGORIES).map(([key, category]) => {
                  const Icon = categoryIcons[category.icon] || Settings;
                  return (
                    <TabsTrigger key={key} value={key} className="flex items-center gap-1 text-xs">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">{category.label.split(' ')[0]}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <ScrollArea className="h-[400px] mt-4">
                {Object.entries(THRESHOLD_CATEGORIES).map(([key, category]) => {
                  const Icon = categoryIcons[category.icon] || Settings;
                  return (
                    <TabsContent key={key} value={key} className="mt-0">
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">{category.label}</CardTitle>
                          </div>
                          <CardDescription>
                            Điều chỉnh các ngưỡng liên quan đến {category.label.toLowerCase()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {category.thresholds.map(thresholdKey => renderThresholdInput(thresholdKey))}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </ScrollArea>
            </Tabs>
          </>
        )}

        <DialogFooter className="flex items-center justify-between gap-2 mt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetThresholds.isPending || !savedConfig}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Khôi phục mặc định
          </Button>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Có thay đổi chưa lưu
              </Badge>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveThresholds.isPending || !hasChanges}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saveThresholds.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
