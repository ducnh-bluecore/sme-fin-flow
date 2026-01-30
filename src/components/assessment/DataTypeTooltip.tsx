/**
 * DataTypeTooltip - Informational tooltips for data types
 * 
 * Explains what each data type means in D2C/Retail context
 */

import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DataTypeTooltipProps {
  dataType: string;
  className?: string;
}

// Tooltip content for each data type
const tooltipContent: Record<string, { title: string; description: string; example?: string }> = {
  invoices: {
    title: 'Doanh thu bán hàng (AR)',
    description: 'Trong D2C/Retail, mỗi đơn hàng từ sàn TMĐT hoặc website chính là một khoản phải thu (Invoice).',
    example: 'Đơn Shopee 500k = Invoice 500k chờ đối soát',
  },
  orders: {
    title: 'Đơn hàng = Invoice',
    description: 'Đơn hàng từ các kênh bán được tự động chuyển thành doanh thu phải thu.',
    example: 'Order TikTok Shop → AR tự động',
  },
  bills: {
    title: 'Phí sàn TMĐT (AP)',
    description: 'Chi phí commission, phí vận chuyển, phí thanh toán từ sàn - được tự động trừ khi đối soát.',
    example: 'Phí Shopee 10% = Bill/AP tự động',
  },
  channel_fees: {
    title: 'Phí kênh bán',
    description: 'Các khoản phí mà sàn TMĐT tự động khấu trừ khi thanh toán cho seller.',
    example: 'Commission + Phí ship + Phí payment',
  },
  settlements: {
    title: 'Tiền về thực (Cash)',
    description: 'Số tiền thực tế chuyển về tài khoản sau khi sàn đã trừ các loại phí. Thường T+7 đến T+14.',
    example: 'Đơn 500k - Phí 50k = Về 450k',
  },
  bank_transactions: {
    title: 'Giao dịch ngân hàng',
    description: 'Sao kê thu chi thực tế từ tài khoản ngân hàng. Nguồn sự thật về dòng tiền.',
  },
  customers: {
    title: 'Khách hàng',
    description: 'Thông tin khách hàng từ các kênh bán. Dùng để phân tích AR theo khách hàng.',
  },
  vendors: {
    title: 'Nhà cung cấp',
    description: 'Danh sách NCC, điều khoản thanh toán. Dùng để quản lý AP và lập kế hoạch thanh toán.',
  },
  expenses: {
    title: 'Chi phí vận hành',
    description: 'Chi phí cố định và biến đổi: lương, thuê mặt bằng, marketing, vận chuyển...',
  },
  products: {
    title: 'Sản phẩm',
    description: 'Danh mục sản phẩm, SKU, giá vốn. Cần thiết cho Unit Economics.',
  },
  inventory: {
    title: 'Tồn kho',
    description: 'Số lượng tồn và giá trị hàng tồn. Đây là "tiền bị khóa" trong vốn lưu động.',
    example: 'Tồn kho 100tr = 100tr tiền đang bị khóa',
  },
  marketing_spend: {
    title: 'Chi phí Marketing',
    description: 'Chi tiêu quảng cáo trên các nền tảng. Dành cho module MDP.',
    example: 'Facebook Ads, Google Ads, TikTok Ads...',
  },
};

export function DataTypeTooltip({ dataType, className }: DataTypeTooltipProps) {
  const content = tooltipContent[dataType];
  
  if (!content) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center p-1 rounded-full",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
              className
            )}
            aria-label={`Thông tin về ${content.title}`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <div className="space-y-1.5">
            <p className="font-semibold text-sm">{content.title}</p>
            <p className="text-xs text-muted-foreground">
              {content.description}
            </p>
            {content.example && (
              <p className="text-xs text-primary/80 italic">
                💡 {content.example}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline version for use in cards/lists
 */
export function DataTypeInfo({ dataType }: { dataType: string }) {
  const content = tooltipContent[dataType];
  
  if (!content) {
    return null;
  }

  return (
    <div className="text-xs text-muted-foreground mt-1">
      {content.description.slice(0, 80)}...
    </div>
  );
}
