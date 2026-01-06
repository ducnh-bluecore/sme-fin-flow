import { Database, FileSpreadsheet, ShoppingCart, Receipt, Building2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataRequirement {
  icon: React.ReactNode;
  label: string;
  description: string;
  available: boolean;
}

interface NoDataOverlayProps {
  requirements: DataRequirement[];
  className?: string;
}

export function NoDataOverlay({ requirements, className }: NoDataOverlayProps) {
  const missingCount = requirements.filter(r => !r.available).length;
  
  return (
    <div className={cn(
      "absolute inset-0 z-10 backdrop-blur-[2px] bg-background/60 flex items-center justify-center rounded-lg",
      className
    )}>
      <div className="max-w-md mx-4 p-6 bg-card border rounded-xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Database className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Không có dữ liệu để tiến hành mô phỏng</h4>
            <p className="text-xs text-muted-foreground">
              Cần {missingCount} nguồn dữ liệu để kích hoạt tính năng này
            </p>
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Dữ liệu cần thiết:
          </p>
          <div className="space-y-2">
            {requirements.map((req, idx) => (
              <div 
                key={idx}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-colors",
                  req.available ? "bg-success/10" : "bg-muted/50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  req.available ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                )}>
                  {req.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    req.available ? "text-success" : "text-foreground"
                  )}>
                    {req.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {req.description}
                  </p>
                </div>
                {req.available ? (
                  <span className="text-xs text-success font-medium">✓ Có</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Thiếu</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          Kết nối dữ liệu từ trang <span className="font-medium">Connectors</span> hoặc <span className="font-medium">Import</span> để bắt đầu mô phỏng
        </p>
      </div>
    </div>
  );
}

// Pre-defined data requirements for different simulation types
export const RETAIL_SIMULATION_REQUIREMENTS = (data: {
  hasOrders: boolean;
  hasRevenue: boolean;
  hasChannels: boolean;
  hasCosts: boolean;
}) => [
  {
    icon: <ShoppingCart className="w-4 h-4" />,
    label: "Đơn hàng (Orders)",
    description: "Dữ liệu đơn hàng từ các kênh bán",
    available: data.hasOrders,
  },
  {
    icon: <TrendingUp className="w-4 h-4" />,
    label: "Doanh thu (Revenue)",
    description: "Thông tin doanh thu và khoản thu",
    available: data.hasRevenue,
  },
  {
    icon: <Building2 className="w-4 h-4" />,
    label: "Kênh bán hàng (Channels)",
    description: "Phân bổ doanh thu theo kênh",
    available: data.hasChannels,
  },
  {
    icon: <Receipt className="w-4 h-4" />,
    label: "Chi phí (Costs)",
    description: "Giá vốn, chi phí vận hành",
    available: data.hasCosts,
  },
];

export const SIMPLE_SIMULATION_REQUIREMENTS = (data: {
  hasRevenue: boolean;
  hasCOGS: boolean;
  hasOPEX: boolean;
  hasCash: boolean;
}) => [
  {
    icon: <TrendingUp className="w-4 h-4" />,
    label: "Doanh thu (Revenue)",
    description: "Tổng doanh thu trong kỳ",
    available: data.hasRevenue,
  },
  {
    icon: <FileSpreadsheet className="w-4 h-4" />,
    label: "Giá vốn (COGS)",
    description: "Chi phí hàng bán",
    available: data.hasCOGS,
  },
  {
    icon: <Receipt className="w-4 h-4" />,
    label: "Chi phí hoạt động (OPEX)",
    description: "Chi phí vận hành, quản lý",
    available: data.hasOPEX,
  },
  {
    icon: <Database className="w-4 h-4" />,
    label: "Dòng tiền (Cash)",
    description: "Số dư tiền mặt hiện tại",
    available: data.hasCash,
  },
];
