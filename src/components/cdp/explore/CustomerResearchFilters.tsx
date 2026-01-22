import { useState } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface FilterValue {
  orderCount?: string;
  lastPurchase?: string;
  repurchaseCycle?: string;
  totalSpend?: string;
  aov?: string;
  returnRate?: string;
  codRate?: string;
  channel?: string;
  productGroup?: string;
}

interface CustomerResearchFiltersProps {
  filters: FilterValue;
  onFiltersChange: (filters: FilterValue) => void;
  filterImpacts: Record<string, number>;
}

interface FilterSection {
  id: string;
  title: string;
  filters: {
    key: keyof FilterValue;
    label: string;
    options: { value: string; label: string }[];
  }[];
}

const filterSections: FilterSection[] = [
  {
    id: 'behavior',
    title: 'Hành vi mua',
    filters: [
      {
        key: 'orderCount',
        label: 'Số đơn hàng',
        options: [
          { value: 'all', label: 'Tất cả' },
          { value: '1', label: '1 đơn (mới)' },
          { value: '2-5', label: '2-5 đơn' },
          { value: '6-10', label: '6-10 đơn' },
          { value: '>10', label: 'Trên 10 đơn' },
        ],
      },
      {
        key: 'lastPurchase',
        label: 'Lần mua gần nhất',
        options: [
          { value: 'all', label: 'Tất cả' },
          { value: '≤30', label: '≤ 30 ngày' },
          { value: '31-60', label: '31-60 ngày' },
          { value: '61-90', label: '61-90 ngày' },
          { value: '>90', label: '> 90 ngày' },
        ],
      },
      {
        key: 'repurchaseCycle',
        label: 'Chu kỳ mua lại',
        options: [
          { value: 'all', label: 'Tất cả' },
          { value: '≤15', label: '≤ 15 ngày (cao)' },
          { value: '16-30', label: '16-30 ngày' },
          { value: '31-60', label: '31-60 ngày' },
          { value: '>60', label: '> 60 ngày (thấp)' },
        ],
      },
    ],
  },
  {
    id: 'value',
    title: 'Giá trị',
    filters: [
      {
        key: 'totalSpend',
        label: 'Tổng chi tiêu',
        options: [
          { value: 'all', label: 'Tất cả' },
          { value: '<1m', label: '< 1 triệu' },
          { value: '1-5m', label: '1-5 triệu' },
          { value: '5-20m', label: '5-20 triệu' },
          { value: '>20m', label: '> 20 triệu' },
        ],
      },
      {
        key: 'aov',
        label: 'AOV',
        options: [
          { value: 'all', label: 'Tất cả' },
          { value: '<500k', label: '< 500K' },
          { value: '500k-1m', label: '500K-1M' },
          { value: '1-2m', label: '1-2 triệu' },
          { value: '>2m', label: '> 2 triệu' },
        ],
      },
    ],
  },
  {
    id: 'risk',
    title: 'Rủi ro',
    filters: [
      {
        key: 'returnRate',
        label: 'Tỷ lệ hoàn trả',
        options: [
          { value: 'all', label: 'Tất cả' },
          { value: '<5%', label: '< 5% (thấp)' },
          { value: '5-15%', label: '5-15%' },
          { value: '>15%', label: '> 15% (cao)' },
        ],
      },
      {
        key: 'codRate',
        label: 'Tỷ lệ COD',
        options: [
          { value: 'all', label: 'Tất cả' },
          { value: '<50%', label: '< 50%' },
          { value: '50-80%', label: '50-80%' },
          { value: '>80%', label: '> 80% (rủi ro)' },
        ],
      },
    ],
  },
  {
    id: 'segment',
    title: 'Kênh / Nhóm SP',
    filters: [
      {
        key: 'channel',
        label: 'Kênh bán',
        options: [
          { value: 'all', label: 'Tất cả kênh' },
          { value: 'website', label: 'Website' },
          { value: 'shopee', label: 'Shopee' },
          { value: 'lazada', label: 'Lazada' },
          { value: 'tiktok', label: 'TikTok Shop' },
        ],
      },
      {
        key: 'productGroup',
        label: 'Nhóm sản phẩm',
        options: [
          { value: 'all', label: 'Tất cả nhóm' },
          { value: 'electronics', label: 'Điện tử' },
          { value: 'fashion', label: 'Thời trang' },
          { value: 'beauty', label: 'Làm đẹp' },
          { value: 'home', label: 'Gia dụng' },
        ],
      },
    ],
  },
];

export function CustomerResearchFilters({ 
  filters, 
  onFiltersChange, 
  filterImpacts 
}: CustomerResearchFiltersProps) {
  const [openSections, setOpenSections] = useState<string[]>(['behavior', 'value']);

  const activeFilterCount = Object.entries(filters).filter(
    ([_, v]) => v && v !== 'all'
  ).length;

  const handleFilterChange = (key: keyof FilterValue, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Bộ lọc nghiên cứu</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} đang áp dụng
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="text-xs h-7"
            >
              <X className="w-3 h-3 mr-1" />
              Xóa tất cả
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filterSections.map((section, index) => (
          <Collapsible
            key={section.id}
            open={openSections.includes(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full py-2 text-left">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {section.title}
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  openSections.includes(section.id) && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pb-3">
              {section.filters.map((filter) => {
                const currentValue = filters[filter.key] || 'all';
                const impact = filterImpacts[filter.key];
                
                return (
                  <div key={filter.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{filter.label}</label>
                      {impact !== undefined && currentValue !== 'all' && (
                        <span className={cn(
                          "text-xs",
                          impact >= 0 ? "text-muted-foreground" : "text-destructive"
                        )}>
                          {impact >= 0 ? '+' : ''}{impact.toLocaleString()} khách
                        </span>
                      )}
                    </div>
                    <Select
                      value={currentValue}
                      onValueChange={(v) => handleFilterChange(filter.key, v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </CollapsibleContent>
            {index < filterSections.length - 1 && <Separator className="mt-2" />}
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
