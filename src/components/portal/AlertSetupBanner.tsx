/**
 * AlertSetupBanner - Displays when tenant has no alert configs
 * Prompts user to initialize default alert configurations
 */

import { AlertTriangle, ArrowRight, Loader2, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface AlertSetupBannerProps {
  onInitialize: () => void;
  isLoading?: boolean;
}

export function AlertSetupBanner({ onInitialize, isLoading = false }: AlertSetupBannerProps) {
  const { language } = useLanguage();
  
  return (
    <Card className="border-warning/50 bg-gradient-to-r from-warning/5 to-warning/10 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-warning/20 border border-warning/30">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              {language === 'vi' 
                ? 'Control Tower chưa có cấu hình cảnh báo' 
                : 'Control Tower has no alert configurations'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'vi'
                ? 'Khởi tạo 32 alert rules mặc định để nhận cảnh báo kịp thời về doanh số, dòng tiền, vận hành.'
                : 'Initialize 32 default alert rules to receive timely alerts about sales, cashflow, and operations.'}
            </p>
          </div>
          
          <Button 
            onClick={onInitialize}
            disabled={isLoading}
            size="sm"
            className="shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                {language === 'vi' ? 'Đang khởi tạo...' : 'Initializing...'}
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-1.5" />
                {language === 'vi' ? 'Khởi tạo ngay' : 'Initialize now'}
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
