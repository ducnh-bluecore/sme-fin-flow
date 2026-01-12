import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  BookOpen, 
  Calculator, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  Package,
  TrendingDown,
  Wallet,
  Store,
  Truck,
  MessageSquare,
  Monitor,
  Target,
  BarChart3,
  Clock,
  Layers,
  Sparkles,
  Zap,
  Database,
  Code
} from "lucide-react";
import { motion } from "framer-motion";
import { useIntelligentAlertRules } from "@/hooks/useIntelligentAlertRules";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Default rules documentation
const defaultRules = [
  // Inventory Rules
  {
    code: "dos_critical",
    name: "Ngày tồn kho thấp (Critical)",
    category: "inventory",
    severity: "critical",
    formula: "Days of Stock = Tồn kho hiện tại / Số lượng bán trung bình ngày",
    example: "100 sản phẩm / 20 sản phẩm/ngày = 5 ngày tồn kho",
    threshold: "< 3 ngày",
    application: "Cảnh báo sản phẩm sắp hết hàng trong vòng 3 ngày, cần đặt hàng khẩn cấp từ NCC",
    dataSources: ["alert_objects (product)", "orders", "inventory"],
    suggestedActions: [
      "Tạo đơn đặt hàng NCC khẩn cấp",
      "Điều chuyển hàng từ kho khác",
      "Tạm dừng khuyến mãi sản phẩm này"
    ]
  },
  {
    code: "dos_warning",
    name: "Ngày tồn kho thấp (Warning)",
    category: "inventory",
    severity: "warning",
    formula: "Days of Stock = Tồn kho hiện tại / Số lượng bán trung bình ngày",
    example: "140 sản phẩm / 20 sản phẩm/ngày = 7 ngày tồn kho",
    threshold: "< 7 ngày",
    application: "Cảnh báo sớm để chuẩn bị đặt hàng, tránh tình trạng stockout",
    dataSources: ["alert_objects (product)", "orders", "inventory"],
    suggestedActions: [
      "Kiểm tra lead time của NCC",
      "Lên kế hoạch đặt hàng",
      "Review lại forecast"
    ]
  },
  {
    code: "REORDER_POINT_HIT",
    name: "Đến điểm đặt hàng",
    category: "inventory",
    severity: "info",
    formula: "Reorder Point Check = Tồn kho hiện tại - Điểm đặt hàng",
    example: "Tồn kho 50 - Reorder Point 60 = -10 (cần đặt hàng)",
    threshold: "≤ 0",
    application: "Thông báo khi tồn kho đạt mức cần đặt hàng bổ sung từ NCC",
    dataSources: ["alert_objects (product)", "reorder_point config"],
    suggestedActions: [
      "Tạo PO cho NCC",
      "Kiểm tra lead time",
      "Tính toán số lượng đặt tối ưu"
    ]
  },
  {
    code: "slow_moving_stock",
    name: "Hàng tồn chậm luân chuyển",
    category: "inventory",
    severity: "warning",
    formula: "Inventory Turnover = (COGS / Trung bình tồn kho) × 365",
    example: "Turnover 30 ngày = Hàng quay vòng 12 lần/năm",
    threshold: "> 60 ngày không bán",
    application: "Phát hiện sản phẩm tồn lâu, cần thanh lý hoặc khuyến mãi",
    dataSources: ["inventory_aging", "sales_data"],
    suggestedActions: [
      "Tạo chương trình khuyến mãi",
      "Thanh lý hàng tồn",
      "Điều chuyển về kho outlet"
    ]
  },
  {
    code: "warehouse_capacity_high",
    name: "Sức chứa kho cao",
    category: "inventory",
    severity: "warning",
    formula: "Capacity Utilization = (Số lượng hiện tại / Sức chứa tối đa) × 100",
    example: "850 units / 1000 max = 85% capacity",
    threshold: "> 85% (warning), > 95% (critical)",
    application: "Cảnh báo kho gần đầy, cần thanh lý hoặc mở rộng",
    dataSources: ["warehouse_inventory", "warehouse_config"],
    suggestedActions: [
      "Thanh lý hàng tồn lâu",
      "Thuê thêm kho",
      "Flash sale giảm tồn"
    ]
  },

  // Cash Flow Rules
  {
    code: "cash_runway_low",
    name: "Cash Runway Thấp",
    category: "cashflow",
    severity: "warning",
    formula: "Cash Runway = Tiền mặt hiện có / Chi tiêu trung bình tháng × 30",
    example: "500M VND / 50M VND/tháng × 30 = 300 ngày",
    threshold: "< 60 ngày (warning), < 30 ngày (critical)",
    application: "Đo lường khả năng duy trì hoạt động với tiền mặt hiện có",
    dataSources: ["bank_accounts", "expenses", "cash_flow"],
    suggestedActions: [
      "Tạm dừng chi tiêu không thiết yếu",
      "Đẩy nhanh thu hồi công nợ",
      "Tìm nguồn vốn bổ sung"
    ]
  },
  {
    code: "cash_coverage_low",
    name: "Tỷ lệ phủ tiền mặt thấp",
    category: "cashflow",
    severity: "warning",
    formula: "Cash Coverage = Tiền mặt khả dụng / Công nợ phải trả",
    example: "100M VND / 150M VND = 0.67 (thiếu 33%)",
    threshold: "< 1.0",
    application: "Cảnh báo khi tiền mặt không đủ trả nợ ngắn hạn",
    dataSources: ["bank_accounts", "bills", "payables"],
    suggestedActions: [
      "Đàm phán gia hạn với NCC",
      "Ưu tiên thanh toán quan trọng",
      "Thu hồi AR khẩn cấp"
    ]
  },

  // Revenue Rules
  {
    code: "revenue_target_miss",
    name: "Không đạt target doanh thu",
    category: "revenue",
    severity: "warning",
    formula: "Target Progress = (Doanh thu thực tế / Target) × 100",
    example: "80M VND / 100M VND × 100 = 80%",
    threshold: "< 80% (warning), < 60% (critical)",
    application: "Theo dõi tiến độ đạt mục tiêu doanh thu theo kỳ",
    dataSources: ["revenues", "monthly_plans", "targets"],
    suggestedActions: [
      "Tăng cường marketing",
      "Chạy khuyến mãi đẩy doanh số",
      "Review chiến lược bán hàng"
    ]
  },
  {
    code: "revenue_decline",
    name: "Doanh thu giảm đột ngột",
    category: "revenue",
    severity: "warning",
    formula: "Revenue Change = ((Doanh thu kỳ này - Doanh thu kỳ trước) / Doanh thu kỳ trước) × 100",
    example: "(70M - 100M) / 100M × 100 = -30%",
    threshold: "Giảm > 20% so với kỳ trước",
    application: "Phát hiện sụt giảm doanh thu bất thường",
    dataSources: ["revenues", "orders"],
    suggestedActions: [
      "Phân tích nguyên nhân",
      "Kiểm tra đối thủ cạnh tranh",
      "Khảo sát khách hàng"
    ]
  },

  // Fulfillment Rules
  {
    code: "return_rate_high",
    name: "Tỷ lệ trả hàng cao",
    category: "fulfillment",
    severity: "warning",
    formula: "Return Rate = (Số đơn hoàn / Tổng đơn giao) × 100",
    example: "15 hoàn / 100 đơn = 15%",
    threshold: "> 8% (warning), > 12% (critical)",
    application: "Theo dõi chất lượng sản phẩm và dịch vụ giao hàng",
    dataSources: ["orders", "returns_data"],
    suggestedActions: [
      "Cải thiện mô tả sản phẩm",
      "Tăng cường QC trước giao",
      "Training đóng gói"
    ]
  },
  {
    code: "cancel_rate_high",
    name: "Tỷ lệ hủy đơn cao",
    category: "fulfillment",
    severity: "warning",
    formula: "Cancel Rate = (Số đơn hủy / Tổng đơn) × 100",
    example: "10 hủy / 100 đơn = 10%",
    threshold: "> 5% (warning), > 10% (critical)",
    application: "Phát hiện vấn đề xác nhận đơn hoặc tồn kho ảo",
    dataSources: ["orders"],
    suggestedActions: [
      "Cập nhật tồn kho realtime",
      "Xác nhận đơn nhanh hơn",
      "Kiểm tra sync inventory"
    ]
  },
  {
    code: "late_delivery_rate",
    name: "Tỷ lệ giao chậm",
    category: "fulfillment",
    severity: "warning",
    formula: "Late Delivery Rate = (Số đơn giao chậm / Tổng đơn) × 100",
    example: "8 đơn chậm / 100 đơn = 8%",
    threshold: "> 5% (warning), > 10% (critical)",
    application: "Đo lường hiệu suất giao hàng đúng hẹn",
    dataSources: ["orders", "shipments"],
    suggestedActions: [
      "Review carrier performance",
      "Điều chỉnh cam kết giao hàng",
      "Tăng cường đội giao"
    ]
  },

  // Operations Rules
  {
    code: "POS_OFFLINE",
    name: "POS mất kết nối",
    category: "operations",
    severity: "critical",
    formula: "Offline Duration = NOW() - Last Heartbeat",
    example: "Last heartbeat 45 phút trước = 45 phút offline",
    threshold: "> 15 phút (warning), > 30 phút (critical)",
    application: "Giám sát thiết bị POS tại cửa hàng",
    dataSources: ["pos_heartbeat", "store_devices"],
    suggestedActions: [
      "Kiểm tra mạng tại cửa hàng",
      "Restart thiết bị",
      "Chuyển chế độ offline"
    ]
  },
  {
    code: "STORE_NO_SALES_2H",
    name: "Cửa hàng không có đơn",
    category: "operations",
    severity: "warning",
    formula: "Hours Without Sale = NOW() - Last Transaction Time",
    example: "Last sale 3 giờ trước = 3 giờ không có đơn",
    threshold: "> 2 giờ (warning), > 4 giờ (critical)",
    application: "Phát hiện cửa hàng không hoạt động bất thường",
    dataSources: ["pos_transactions", "store_orders"],
    suggestedActions: [
      "Kiểm tra POS có hoạt động",
      "Liên hệ nhân viên cửa hàng",
      "Xác nhận giờ mở cửa"
    ]
  },

  // Service Rules
  {
    code: "MESSAGE_UNANSWERED",
    name: "Tin nhắn chưa trả lời",
    category: "service",
    severity: "warning",
    formula: "Response Delay = NOW() - Message Received At",
    example: "Tin nhắn nhận 45 phút trước = 45 phút chưa trả lời",
    threshold: "> 30 phút (warning), > 60 phút (critical)",
    application: "Đảm bảo chất lượng chăm sóc khách hàng trên social",
    dataSources: ["social_messages", "chat_logs"],
    suggestedActions: [
      "Phản hồi ngay",
      "Setup auto-reply ngoài giờ",
      "Tăng cường nhân sự CS"
    ]
  },
  {
    code: "negative_review",
    name: "Đánh giá tiêu cực",
    category: "service",
    severity: "warning",
    formula: "Review Analysis = Đánh giá ≤ 2 sao hoặc sentiment negative",
    example: "Review 1 sao với nội dung phàn nàn",
    threshold: "≤ 2 sao hoặc keyword tiêu cực",
    application: "Phát hiện và xử lý feedback tiêu cực kịp thời",
    dataSources: ["product_reviews", "platform_ratings"],
    suggestedActions: [
      "Liên hệ khách hàng xin lỗi",
      "Đề xuất giải pháp bồi thường",
      "Cải thiện sản phẩm/dịch vụ"
    ]
  },

  // Financial Rules
  {
    code: "ar_overdue",
    name: "Công nợ quá hạn",
    category: "financial",
    severity: "warning",
    formula: "Days Overdue = NOW() - Due Date",
    example: "Due 15/01, NOW 25/01 = 10 ngày quá hạn",
    threshold: "> 7 ngày (warning), > 30 ngày (critical)",
    application: "Theo dõi và thu hồi công nợ phải thu",
    dataSources: ["invoices", "ar_aging"],
    suggestedActions: [
      "Gửi email nhắc thanh toán",
      "Gọi điện đốc thu",
      "Tạm dừng cấp credit"
    ]
  },
  {
    code: "ap_due_soon",
    name: "Công nợ sắp đến hạn",
    category: "financial",
    severity: "info",
    formula: "Days Until Due = Due Date - NOW()",
    example: "Due 20/01, NOW 15/01 = 5 ngày nữa đến hạn",
    threshold: "≤ 7 ngày",
    application: "Nhắc nhở thanh toán công nợ đúng hạn",
    dataSources: ["bills", "ap_aging"],
    suggestedActions: [
      "Chuẩn bị nguồn tiền",
      "Lên lịch thanh toán",
      "Kiểm tra cash flow"
    ]
  },
  {
    code: "gross_margin_low",
    name: "Biên lợi nhuận gộp thấp",
    category: "financial",
    severity: "warning",
    formula: "Gross Margin = ((Doanh thu - COGS) / Doanh thu) × 100",
    example: "(100M - 75M) / 100M × 100 = 25%",
    threshold: "< 30% (warning), < 20% (critical)",
    application: "Giám sát hiệu quả kinh doanh sản phẩm/kênh",
    dataSources: ["pl_data", "cogs", "revenues"],
    suggestedActions: [
      "Review giá bán",
      "Đàm phán giá mua với NCC",
      "Tối ưu chi phí vận hành"
    ]
  }
];

// Category config
const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  inventory: { label: "Tồn kho", icon: Package, color: "bg-blue-500" },
  cashflow: { label: "Dòng tiền", icon: Wallet, color: "bg-green-500" },
  revenue: { label: "Doanh thu", icon: TrendingDown, color: "bg-purple-500" },
  fulfillment: { label: "Fulfillment", icon: Truck, color: "bg-orange-500" },
  operations: { label: "Vận hành", icon: Monitor, color: "bg-red-500" },
  service: { label: "CSKH", icon: MessageSquare, color: "bg-pink-500" },
  financial: { label: "Tài chính", icon: BarChart3, color: "bg-cyan-500" },
};

const severityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: "Critical", color: "bg-red-500 text-white" },
  warning: { label: "Warning", color: "bg-amber-500 text-white" },
  info: { label: "Info", color: "bg-blue-500 text-white" },
};

export default function AlertRulesDocPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"default" | "intelligent">("default");

  // Fetch intelligent rules from database
  const { rules: intelligentRules, isLoading: loadingIntelligent } = useIntelligentAlertRules();

  const filteredRules = useMemo(() => {
    return defaultRules.filter(rule => {
      const matchesSearch = 
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.application.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = activeCategory === "all" || rule.category === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const rulesByCategory = useMemo(() => {
    const grouped: Record<string, typeof defaultRules> = {};
    filteredRules.forEach(rule => {
      if (!grouped[rule.category]) {
        grouped[rule.category] = [];
      }
      grouped[rule.category].push(rule);
    });
    return grouped;
  }, [filteredRules]);

  // Filter intelligent rules
  const filteredIntelligentRules = useMemo(() => {
    return (intelligentRules || []).filter(rule => {
      const matchesSearch = 
        rule.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.rule_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rule.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = activeCategory === "all" || rule.rule_category === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [intelligentRules, searchQuery, activeCategory]);

  const intelligentRulesByCategory = useMemo(() => {
    const grouped: Record<string, typeof intelligentRules> = {};
    filteredIntelligentRules.forEach(rule => {
      if (!grouped[rule.rule_category]) {
        grouped[rule.rule_category] = [];
      }
      grouped[rule.rule_category].push(rule);
    });
    return grouped;
  }, [filteredIntelligentRules]);

  // Parse formula for display
  const parseFormula = (formula: string | object | null): { formula: string; dataSources?: string[]; example?: string } => {
    if (!formula) return { formula: 'N/A' };
    if (typeof formula === 'string') {
      try {
        const parsed = JSON.parse(formula);
        return {
          formula: parsed.formula || formula,
          dataSources: parsed.data_sources,
          example: parsed.example
        };
      } catch {
        return { formula };
      }
    }
    if (typeof formula === 'object') {
      const f = formula as any;
      return {
        formula: f.formula || JSON.stringify(formula),
        dataSources: f.data_sources,
        example: f.example
      };
    }
    return { formula: String(formula) };
  };

  // Parse threshold config
  const parseThreshold = (config: any): string => {
    if (!config) return 'N/A';
    const parts: string[] = [];
    if (config.critical !== undefined) parts.push(`Critical: ${config.operator || '<'} ${config.critical}${config.unit || ''}`);
    if (config.warning !== undefined) parts.push(`Warning: ${config.operator || '<'} ${config.warning}${config.unit || ''}`);
    if (config.info !== undefined) parts.push(`Info: ${config.operator || '<'} ${config.info}${config.unit || ''}`);
    if (config.value !== undefined) parts.push(`${config.operator || '<'} ${config.value}${config.unit || ''}`);
    if (config.benchmark !== undefined) parts.push(`Benchmark: ${config.benchmark}%`);
    return parts.length > 0 ? parts.join(' | ') : JSON.stringify(config);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tài liệu Rule Cảnh báo</h1>
            <p className="text-muted-foreground">
              Mô tả chi tiết các rule mặc định và intelligent rules, công thức tính và ứng dụng
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm rule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Tabs: Default vs Intelligent */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "default" | "intelligent")}>
        <TabsList className="mb-4">
          <TabsTrigger value="default" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Rules Mặc định ({defaultRules.length})
          </TabsTrigger>
          <TabsTrigger value="intelligent" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Intelligent Rules ({intelligentRules?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Default Rules Tab */}
        <TabsContent value="default">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="gap-2">
                <Layers className="h-4 w-4" />
                Tất cả ({defaultRules.length})
              </TabsTrigger>
              {Object.entries(categoryConfig).map(([key, config]) => {
                const count = defaultRules.filter(r => r.category === key).length;
                if (count === 0) return null;
                const Icon = config.icon;
                return (
                  <TabsTrigger key={key} value={key} className="gap-2">
                    <Icon className="h-4 w-4" />
                    {config.label} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={activeCategory} className="mt-6">
              <ScrollArea className="h-[calc(100vh-380px)]">
                <div className="space-y-6 pr-4">
                  {Object.entries(rulesByCategory).map(([category, rules]) => {
                    const config = categoryConfig[category];
                    const Icon = config?.icon || AlertTriangle;
                    
                    return (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <div className={`p-1.5 rounded ${config?.color || 'bg-gray-500'}`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <h2 className="text-lg font-semibold">{config?.label || category}</h2>
                          <Badge variant="secondary">{rules.length} rules</Badge>
                        </div>

                        <Accordion type="multiple" className="space-y-3">
                          {rules.map((rule) => (
                            <AccordionItem
                              key={rule.code}
                              value={rule.code}
                              className="border rounded-lg px-4 bg-card"
                            >
                              <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3 text-left">
                                  <Badge className={severityConfig[rule.severity]?.color}>
                                    {severityConfig[rule.severity]?.label}
                                  </Badge>
                                  <div>
                                    <div className="font-medium">{rule.name}</div>
                                    <div className="text-sm text-muted-foreground font-mono">
                                      {rule.code}
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-4">
                                <div className="space-y-4">
                                  {/* Application */}
                                  <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                                    <Target className="h-5 w-5 text-primary mt-0.5" />
                                    <div>
                                      <div className="font-medium text-primary">Ứng dụng</div>
                                      <p className="text-sm text-muted-foreground">{rule.application}</p>
                                    </div>
                                  </div>

                                  {/* Formula */}
                                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                    <Calculator className="h-5 w-5 text-foreground mt-0.5" />
                                    <div className="flex-1">
                                      <div className="font-medium">Công thức</div>
                                      <code className="text-sm bg-background px-2 py-1 rounded block mt-1">
                                        {rule.formula}
                                      </code>
                                      <div className="text-sm text-muted-foreground mt-2">
                                        <span className="font-medium">Ví dụ:</span> {rule.example}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Threshold */}
                                  <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                    <div>
                                      <div className="font-medium text-amber-700 dark:text-amber-400">Ngưỡng cảnh báo</div>
                                      <p className="text-sm">{rule.threshold}</p>
                                    </div>
                                  </div>

                                  {/* Data Sources */}
                                  <div className="flex items-start gap-3">
                                    <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                      <div className="font-medium text-sm">Nguồn dữ liệu</div>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {rule.dataSources.map((source) => (
                                          <Badge key={source} variant="outline" className="font-mono text-xs">
                                            {source}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Suggested Actions */}
                                  <div className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                    <div>
                                      <div className="font-medium text-sm text-green-700 dark:text-green-400">Hành động đề xuất</div>
                                      <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-0.5">
                                        {rule.suggestedActions.map((action, idx) => (
                                          <li key={idx}>{action}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </motion.div>
                    );
                  })}

                  {filteredRules.length === 0 && (
                    <Card className="p-8 text-center">
                      <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Không tìm thấy rule nào phù hợp
                      </p>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Intelligent Rules Tab */}
        <TabsContent value="intelligent">
          {loadingIntelligent ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Tất cả ({intelligentRules?.length || 0})
                </TabsTrigger>
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const count = (intelligentRules || []).filter(r => r.rule_category === key).length;
                  if (count === 0) return null;
                  const Icon = config.icon;
                  return (
                    <TabsTrigger key={key} value={key} className="gap-2">
                      <Icon className="h-4 w-4" />
                      {config.label} ({count})
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value={activeCategory} className="mt-6">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <div className="space-y-6 pr-4">
                    {Object.entries(intelligentRulesByCategory).map(([category, rules]) => {
                      const config = categoryConfig[category];
                      const Icon = config?.icon || AlertTriangle;
                      
                      return (
                        <motion.div
                          key={category}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex items-center gap-2 mb-4">
                            <div className={`p-1.5 rounded ${config?.color || 'bg-gray-500'}`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <h2 className="text-lg font-semibold">{config?.label || category}</h2>
                            <Badge variant="secondary">{rules.length} rules</Badge>
                          </div>

                          <Accordion type="multiple" className="space-y-3">
                            {rules.map((rule) => {
                              const formulaData = parseFormula(rule.calculation_formula);
                              const thresholdText = parseThreshold(rule.threshold_config);
                              const suggestedActions = Array.isArray(rule.suggested_actions) 
                                ? rule.suggested_actions 
                                : [];

                              return (
                                <AccordionItem
                                  key={rule.id}
                                  value={rule.id}
                                  className="border rounded-lg px-4 bg-card"
                                >
                                  <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3 text-left">
                                      <Badge className={severityConfig[rule.severity]?.color}>
                                        {severityConfig[rule.severity]?.label}
                                      </Badge>
                                      <Badge variant={rule.is_enabled ? "default" : "outline"} className="gap-1">
                                        <Zap className="h-3 w-3" />
                                        {rule.is_enabled ? 'Active' : 'Inactive'}
                                      </Badge>
                                      <div>
                                        <div className="font-medium">{rule.rule_name}</div>
                                        <div className="text-sm text-muted-foreground font-mono">
                                          {rule.rule_code}
                                        </div>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-4">
                                    <div className="space-y-4">
                                      {/* Description */}
                                      {rule.description && (
                                        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                                          <Target className="h-5 w-5 text-primary mt-0.5" />
                                          <div>
                                            <div className="font-medium text-primary">Mô tả</div>
                                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Formula */}
                                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                        <Code className="h-5 w-5 text-foreground mt-0.5" />
                                        <div className="flex-1">
                                          <div className="font-medium">Công thức tính</div>
                                          <code className="text-sm bg-background px-2 py-1 rounded block mt-1 whitespace-pre-wrap">
                                            {formulaData.formula}
                                          </code>
                                          {formulaData.example && (
                                            <div className="text-sm text-muted-foreground mt-2">
                                              <span className="font-medium">Ví dụ:</span> {formulaData.example}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Threshold */}
                                      <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                        <div>
                                          <div className="font-medium text-amber-700 dark:text-amber-400">
                                            Ngưỡng ({rule.threshold_type})
                                          </div>
                                          <p className="text-sm">{thresholdText}</p>
                                        </div>
                                      </div>

                                      {/* Data Sources */}
                                      {formulaData.dataSources && formulaData.dataSources.length > 0 && (
                                        <div className="flex items-start gap-3">
                                          <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
                                          <div>
                                            <div className="font-medium text-sm">Nguồn dữ liệu</div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {formulaData.dataSources.map((source) => (
                                                <Badge key={source} variant="outline" className="font-mono text-xs">
                                                  {source}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Applicable Channels */}
                                      {rule.applicable_channels && rule.applicable_channels.length > 0 && (
                                        <div className="flex items-start gap-3">
                                          <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
                                          <div>
                                            <div className="font-medium text-sm">Kênh áp dụng</div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {rule.applicable_channels.map((channel) => (
                                                <Badge key={channel} variant="secondary" className="text-xs">
                                                  {channel}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Suggested Actions */}
                                      {suggestedActions.length > 0 && (
                                        <div className="flex items-start gap-3">
                                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                          <div>
                                            <div className="font-medium text-sm text-green-700 dark:text-green-400">Hành động đề xuất</div>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-0.5">
                                              {suggestedActions.map((action, idx) => (
                                                <li key={idx}>{typeof action === 'string' ? action : JSON.stringify(action)}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        </div>
                                      )}

                                      {/* Priority */}
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className="font-medium">Priority:</span> {rule.priority}
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        </motion.div>
                      );
                    })}

                    {filteredIntelligentRules.length === 0 && (
                      <Card className="p-8 text-center">
                        <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          Không tìm thấy intelligent rule nào phù hợp
                        </p>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{defaultRules.length}</div>
              <div className="text-sm text-muted-foreground">Rules mặc định</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{intelligentRules?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Intelligent Rules</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {defaultRules.filter(r => r.severity === 'critical').length + 
                 (intelligentRules || []).filter(r => r.severity === 'critical').length}
              </div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {defaultRules.filter(r => r.severity === 'warning').length +
                 (intelligentRules || []).filter(r => r.severity === 'warning').length}
              </div>
              <div className="text-sm text-muted-foreground">Warning</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Zap className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {(intelligentRules || []).filter(r => r.is_enabled).length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
