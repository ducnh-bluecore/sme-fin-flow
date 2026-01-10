import { Info, Calculator } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface FormulaDefinition {
  formula: string;
  title: string;
  explanation: string;
  affectedMetrics?: string[];
  example?: string;
}

export const FORMULA_DEFINITIONS: Record<string, FormulaDefinition> = {
  revenueChange: {
    formula: 'Doanh thu mới = Doanh thu cơ sở × (1 + Δ Doanh thu%) × (1 + Δ Giá%) × (1 + Δ Sản lượng%)',
    title: 'Thay đổi doanh thu',
    explanation: 'Doanh thu thay đổi theo 3 yếu tố: điều chỉnh trực tiếp, thay đổi giá bán và thay đổi sản lượng. Các yếu tố này được nhân với nhau (multiplicative).',
    affectedMetrics: ['Doanh thu', 'Gross Margin', 'EBITDA', 'Lợi nhuận'],
    example: 'VD: +10% doanh thu × +5% giá × +8% sản lượng = +24.74% doanh thu tổng',
  },
  priceChange: {
    formula: 'Doanh thu mới = Doanh thu cơ sở × (1 + Δ Giá%)',
    title: 'Thay đổi giá bán',
    explanation: 'Tăng giá bán làm tăng doanh thu trực tiếp nhưng có thể ảnh hưởng đến sản lượng. Giá bán KHÔNG ảnh hưởng đến COGS (chi phí vẫn theo sản lượng).',
    affectedMetrics: ['Doanh thu', 'Gross Margin', 'EBITDA'],
    example: 'VD: Giá tăng +10% → Doanh thu tăng +10%, COGS không đổi → Gross Margin cải thiện',
  },
  volumeChange: {
    formula: 'Doanh thu mới = Doanh thu cơ sở × (1 + Δ Sản lượng%)\nCOGS mới = COGS cơ sở × (1 + Δ Sản lượng%)',
    title: 'Thay đổi sản lượng',
    explanation: 'Sản lượng ảnh hưởng đồng thời đến cả doanh thu VÀ giá vốn (COGS). Khi bán nhiều hơn, cả doanh thu và chi phí hàng bán đều tăng.',
    affectedMetrics: ['Doanh thu', 'COGS', 'EBITDA'],
    example: 'VD: Sản lượng tăng +20% → Doanh thu +20%, COGS +20%',
  },
  cogsChange: {
    formula: 'COGS mới = COGS cơ sở × (1 + Δ COGS%) × (1 + Δ Sản lượng%)\nGross Profit = Doanh thu - COGS',
    title: 'Thay đổi giá vốn (COGS)',
    explanation: 'COGS thay đổi theo cả % điều chỉnh chi phí VÀ thay đổi sản lượng. Giảm COGS sẽ cải thiện Gross Margin và EBITDA.',
    affectedMetrics: ['COGS', 'Gross Margin', 'EBITDA', 'Lợi nhuận'],
    example: 'VD: COGS giảm -5% → Gross Margin tăng, EBITDA tăng',
  },
  opexChange: {
    formula: 'OPEX mới = OPEX cơ sở × (1 + Δ OPEX%)\nEBITDA = Gross Profit - OPEX',
    title: 'Thay đổi chi phí vận hành (OPEX)',
    explanation: 'Chi phí vận hành (lương, thuê mặt bằng, marketing, etc.) không phụ thuộc vào sản lượng. Giảm OPEX trực tiếp cải thiện EBITDA.',
    affectedMetrics: ['OPEX', 'EBITDA', 'Lợi nhuận'],
    example: 'VD: OPEX giảm -10% → EBITDA tăng tương ứng',
  },
  // Retail channel specific formulas
  channelGrowth: {
    formula: 'Doanh thu kênh = Doanh thu cơ sở × Tỷ trọng kênh% × (1 + Tốc độ tăng trưởng%)',
    title: 'Tăng trưởng kênh bán',
    explanation: 'Mỗi kênh có tỷ trọng doanh thu và tốc độ tăng trưởng riêng. Tổng doanh thu = Σ doanh thu các kênh.',
    affectedMetrics: ['Doanh thu kênh', 'Tổng doanh thu'],
  },
  marketplaceCommission: {
    formula: 'Phí sàn = Doanh thu kênh × Tỷ lệ hoa hồng%',
    title: 'Hoa hồng sàn TMĐT',
    explanation: 'Mỗi sàn thương mại điện tử có tỷ lệ hoa hồng khác nhau. Phí này trừ trực tiếp vào lợi nhuận.',
    affectedMetrics: ['Chi phí bán hàng', 'Lợi nhuận gộp', 'EBITDA'],
    example: 'VD: Shopee 8%, Lazada 10%, TikTok Shop 5%',
  },
  returnRate: {
    formula: 'Chi phí đổi trả = Doanh thu × Tỷ lệ đổi trả% × Chi phí xử lý%',
    title: 'Tỷ lệ đổi trả',
    explanation: 'Hàng bị đổi trả không chỉ mất doanh thu mà còn phát sinh chi phí xử lý, vận chuyển ngược và hàng hỏng.',
    affectedMetrics: ['Chi phí đổi trả', 'Lợi nhuận gộp'],
  },
  shippingCost: {
    formula: 'Chi phí vận chuyển = Số đơn hàng × Chi phí/đơn',
    title: 'Chi phí vận chuyển',
    explanation: 'Chi phí vận chuyển tính theo số lượng đơn hàng. Có thể tối ưu bằng cách tăng giá trị đơn hàng trung bình.',
    affectedMetrics: ['Chi phí fulfillment', 'Lợi nhuận'],
  },
  grossMargin: {
    formula: 'Gross Margin = (Doanh thu - COGS) / Doanh thu × 100%',
    title: 'Biên lợi nhuận gộp',
    explanation: 'Tỷ lệ phần trăm lợi nhuận sau khi trừ chi phí hàng bán. Bị ảnh hưởng bởi cả doanh thu và COGS.',
    affectedMetrics: ['Profitability ratio'],
  },
  ebitda: {
    formula: 'EBITDA = Doanh thu - COGS - OPEX\n       = Gross Profit - Chi phí vận hành',
    title: 'EBITDA',
    explanation: 'Lợi nhuận trước lãi vay, thuế và khấu hao. Phản ánh hiệu quả hoạt động kinh doanh cốt lõi.',
    affectedMetrics: ['Lợi nhuận', 'Định giá doanh nghiệp'],
  },
};

interface FormulaTooltipProps {
  formulaKey: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
  variant?: 'tooltip' | 'hovercard';
}

export function FormulaTooltip({
  formulaKey,
  children,
  showIcon = true,
  className,
  variant = 'tooltip',
}: FormulaTooltipProps) {
  const formula = FORMULA_DEFINITIONS[formulaKey];
  
  if (!formula) return <>{children}</>;

  const content = (
    <div className="space-y-3 text-left">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">{formula.title}</span>
      </div>
      
      <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs whitespace-pre-line">
        {formula.formula}
      </div>
      
      <p className="text-xs text-muted-foreground leading-relaxed">
        {formula.explanation}
      </p>
      
      {formula.example && (
        <p className="text-xs text-primary/80 italic">
          {formula.example}
        </p>
      )}
      
      {formula.affectedMetrics && formula.affectedMetrics.length > 0 && (
        <>
          <Separator className="my-2" />
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground mr-1">Ảnh hưởng đến:</span>
            {formula.affectedMetrics.map((metric) => (
              <Badge key={metric} variant="secondary" className="text-xs px-1.5 py-0">
                {metric}
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (variant === 'hovercard') {
    return (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <span className={cn('inline-flex items-center gap-1 cursor-help', className)}>
            {children}
            {showIcon && (
              <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </span>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          {content}
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1 cursor-help', className)}>
            {children}
            {showIcon && (
              <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs p-4">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact tooltip for displaying formulas inline
interface FormulaChipProps {
  formulaKey: string;
  className?: string;
}

export function FormulaChip({ formulaKey, className }: FormulaChipProps) {
  const formula = FORMULA_DEFINITIONS[formulaKey];
  if (!formula) return null;

  return (
    <FormulaTooltip formulaKey={formulaKey} showIcon={false} variant="hovercard">
      <Badge 
        variant="outline" 
        className={cn(
          'text-xs px-1.5 py-0 cursor-help hover:bg-primary/10 transition-colors',
          className
        )}
      >
        <Calculator className="w-3 h-3 mr-1" />
        Xem công thức
      </Badge>
    </FormulaTooltip>
  );
}

// Panel showing relationship summary between inputs and outputs
export function FormulaRelationshipPanel() {
  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calculator className="w-4 h-4 text-primary" />
        Mối quan hệ tham số → Kết quả
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-2">
          <p className="font-medium text-foreground">📈 Tác động đến Doanh thu:</p>
          <ul className="space-y-1 text-muted-foreground pl-4">
            <li>• Δ Doanh thu % (trực tiếp)</li>
            <li>• Δ Giá bán % (multiplicative)</li>
            <li>• Δ Sản lượng % (multiplicative)</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <p className="font-medium text-foreground">📦 Tác động đến COGS:</p>
          <ul className="space-y-1 text-muted-foreground pl-4">
            <li>• Δ Giá vốn % (trực tiếp)</li>
            <li>• Δ Sản lượng % (multiplicative)</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <p className="font-medium text-foreground">💰 Tác động đến Gross Margin:</p>
          <ul className="space-y-1 text-muted-foreground pl-4">
            <li>• = (Doanh thu - COGS) / Doanh thu</li>
            <li>• Tăng giá → tăng margin</li>
            <li>• Giảm COGS → tăng margin</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <p className="font-medium text-foreground">🎯 Tác động đến EBITDA:</p>
          <ul className="space-y-1 text-muted-foreground pl-4">
            <li>• = Gross Profit - OPEX</li>
            <li>• Mọi tham số đều ảnh hưởng</li>
            <li>• Giảm OPEX → tăng trực tiếp</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
