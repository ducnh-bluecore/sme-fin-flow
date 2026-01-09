import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  BookOpen,
  LayoutDashboard,
  FileText,
  TrendingUp,
  Wallet,
  BarChart3,
  Shield,
  Settings,
  Users,
  Database,
  AlertTriangle,
  Calculator,
  GitBranch,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  pages: {
    name: string;
    path: string;
    description: string;
    features: string[];
    dataSource?: string;
  }[];
}

const guideSections: GuideSection[] = [
  {
    id: "dashboard",
    title: "Dashboard & Tổng quan",
    icon: <LayoutDashboard className="h-5 w-5" />,
    description: "Các trang tổng quan và báo cáo điều hành",
    pages: [
      {
        name: "CFO Dashboard",
        path: "/",
        description: "Bảng điều khiển chính với các KPI quan trọng nhất",
        features: [
          "Tiền mặt hiện tại (Cash Today)",
          "Tổng công nợ phải thu (Total AR)",
          "Công nợ quá hạn (Overdue AR)",
          "DSO, DPO, DIO, CCC",
          "Biểu đồ dự báo dòng tiền",
          "Phân tích AR Aging",
          "AI Insights tự động",
        ],
        dataSource: "bank_accounts, invoices, bills, cash_forecasts",
      },
      {
        name: "Executive Summary",
        path: "/executive-summary",
        description: "Báo cáo tóm tắt cho Ban điều hành",
        features: [
          "Tổng quan tài chính",
          "Các quyết định cần phê duyệt",
          "Cảnh báo quan trọng",
          "Xu hướng KPI",
        ],
        dataSource: "Tổng hợp từ nhiều bảng",
      },
      {
        name: "Board Reports",
        path: "/board-reports",
        description: "Báo cáo định kỳ cho HĐQT",
        features: [
          "Tạo báo cáo tự động",
          "Xuất PDF/Excel",
          "Lưu trữ lịch sử báo cáo",
        ],
        dataSource: "board_reports",
      },
    ],
  },
  {
    id: "ar-ap",
    title: "Công nợ Phải thu & Phải trả",
    icon: <FileText className="h-5 w-5" />,
    description: "Quản lý hóa đơn, công nợ khách hàng và nhà cung cấp",
    pages: [
      {
        name: "AR Operations",
        path: "/ar-operations",
        description: "Quản lý công nợ phải thu",
        features: [
          "Danh sách hóa đơn",
          "Phân tích AR Aging (0-30, 31-60, 61-90, >90 ngày)",
          "Theo dõi thanh toán",
          "Gửi nhắc nợ",
        ],
        dataSource: "invoices, customers, payments",
      },
      {
        name: "Invoice Tracking",
        path: "/invoice-tracking",
        description: "Theo dõi chi tiết từng hóa đơn",
        features: [
          "Tạo hóa đơn mới",
          "Cập nhật trạng thái",
          "Lịch sử thanh toán",
          "Xuất hóa đơn PDF",
        ],
        dataSource: "invoices, invoice_items",
      },
      {
        name: "Bills (AP)",
        path: "/bills",
        description: "Quản lý hóa đơn mua hàng",
        features: [
          "Danh sách hóa đơn mua",
          "Phân tích AP Aging",
          "Lên lịch thanh toán",
          "Phê duyệt thanh toán",
        ],
        dataSource: "bills, bill_items, vendors",
      },
      {
        name: "Credit/Debit Notes",
        path: "/credit-debit-notes",
        description: "Quản lý công nợ điều chỉnh",
        features: [
          "Tạo Credit Note",
          "Tạo Debit Note",
          "Liên kết với hóa đơn gốc",
        ],
        dataSource: "credit_debit_notes",
      },
    ],
  },
  {
    id: "revenue",
    title: "Doanh thu & Lợi nhuận",
    icon: <TrendingUp className="h-5 w-5" />,
    description: "Phân tích doanh thu, chi phí và biên lợi nhuận",
    pages: [
      {
        name: "Revenue",
        path: "/revenue",
        description: "Tổng quan doanh thu theo thời gian",
        features: [
          "Doanh thu theo tháng/quý/năm",
          "So sánh với kỳ trước",
          "Phân tích theo kênh bán",
        ],
        dataSource: "revenues, external_orders",
      },
      {
        name: "P&L Report",
        path: "/pl-report",
        description: "Báo cáo Lãi/Lỗ chi tiết",
        features: [
          "Doanh thu - Chi phí - Lợi nhuận",
          "Gross Margin, EBITDA",
          "So sánh Budget vs Actual",
        ],
        dataSource: "revenues, expenses, budgets",
      },
      {
        name: "Channel Analytics",
        path: "/channel-analytics",
        description: "Phân tích hiệu quả từng kênh bán",
        features: [
          "Doanh thu theo kênh",
          "Chi phí phí kênh (Commission, Shipping...)",
          "Lợi nhuận ròng theo kênh",
          "So sánh hiệu quả kênh",
        ],
        dataSource: "external_orders, channel_fees, channel_analytics_cache",
      },
      {
        name: "Channel P&L",
        path: "/channel-pl",
        description: "Báo cáo Lãi/Lỗ theo kênh",
        features: [
          "P&L chi tiết từng kênh",
          "Phân tích chi phí",
          "Margin theo kênh",
        ],
        dataSource: "external_orders, channel_fees",
      },
      {
        name: "Promotion ROI",
        path: "/promotion-roi",
        description: "Đánh giá hiệu quả khuyến mãi",
        features: [
          "ROI từng chương trình",
          "Chi phí khuyến mãi",
          "Doanh thu tăng thêm",
        ],
        dataSource: "promotions",
      },
    ],
  },
  {
    id: "cash",
    title: "Dòng tiền & Dự báo",
    icon: <Wallet className="h-5 w-5" />,
    description: "Quản lý tiền mặt và dự báo dòng tiền",
    pages: [
      {
        name: "Cash Forecast",
        path: "/cash-forecast",
        description: "Dự báo dòng tiền ngắn hạn",
        features: [
          "Dự báo theo ngày/tuần",
          "Thu - Chi dự kiến",
          "Số dư cuối kỳ",
          "Cảnh báo thiếu hụt",
        ],
        dataSource: "cash_forecasts, bank_accounts",
      },
      {
        name: "Cash Flow Direct",
        path: "/cash-flow-direct",
        description: "Báo cáo dòng tiền trực tiếp",
        features: [
          "Thu từ khách hàng",
          "Chi cho nhà cung cấp",
          "Chi lương, thuế, lãi vay",
          "Dòng tiền hoạt động/đầu tư/tài chính",
        ],
        dataSource: "cash_flow_direct",
      },
      {
        name: "Rolling Forecast",
        path: "/rolling-forecast",
        description: "Dự báo cuốn chiếu 12 tháng",
        features: [
          "Dự báo liên tục",
          "So sánh với kế hoạch",
          "Điều chỉnh dự báo",
        ],
        dataSource: "rolling_forecasts",
      },
      {
        name: "Bank Connections",
        path: "/bank-connections",
        description: "Kết nối tài khoản ngân hàng",
        features: [
          "Đồng bộ số dư",
          "Import giao dịch",
          "Đối soát tự động",
        ],
        dataSource: "bank_accounts, bank_transactions, bank_connection_configs",
      },
    ],
  },
  {
    id: "working-capital",
    title: "Vốn lưu động",
    icon: <BarChart3 className="h-5 w-5" />,
    description: "Phân tích và tối ưu vốn lưu động",
    pages: [
      {
        name: "Working Capital",
        path: "/working-capital",
        description: "Tổng quan vốn lưu động",
        features: [
          "Current Ratio, Quick Ratio",
          "Working Capital = CA - CL",
          "Phân tích thành phần",
        ],
        dataSource: "invoices, bills, inventories",
      },
      {
        name: "Cash Conversion Cycle",
        path: "/cash-conversion-cycle",
        description: "Chu kỳ chuyển đổi tiền mặt",
        features: [
          "DSO (Days Sales Outstanding)",
          "DPO (Days Payable Outstanding)",
          "DIO (Days Inventory Outstanding)",
          "CCC = DSO + DIO - DPO",
        ],
        dataSource: "Tính toán từ invoices, bills, inventories",
      },
      {
        name: "Inventory Aging",
        path: "/inventory-aging",
        description: "Phân tích tuổi tồn kho",
        features: [
          "Hàng tồn theo bucket tuổi",
          "Slow-moving items",
          "Đề xuất xử lý",
        ],
        dataSource: "inventories",
      },
      {
        name: "Unit Economics",
        path: "/unit-economics",
        description: "Kinh tế đơn vị sản phẩm",
        features: [
          "CAC, LTV, LTV/CAC",
          "Contribution Margin",
          "Break-even analysis",
        ],
        dataSource: "Tính toán từ orders, customers, expenses",
      },
    ],
  },
  {
    id: "planning",
    title: "Kế hoạch & Kịch bản",
    icon: <GitBranch className="h-5 w-5" />,
    description: "Lập kế hoạch tài chính và mô phỏng kịch bản",
    pages: [
      {
        name: "Budget vs Actual",
        path: "/budget-vs-actual",
        description: "So sánh ngân sách với thực tế",
        features: [
          "Variance Analysis",
          "Theo tháng/quý",
          "Phân tích nguyên nhân chênh lệch",
        ],
        dataSource: "budgets, monthly_plans, revenues, expenses",
      },
      {
        name: "Scenario Hub",
        path: "/scenario-hub",
        description: "Trung tâm kịch bản & What-If",
        features: [
          "Tạo kịch bản tài chính",
          "Mô phỏng What-If",
          "Import What-If → Scenario",
          "So sánh kịch bản",
        ],
        dataSource: "scenarios, whatif_scenarios, monthly_plans",
      },
      {
        name: "Variance Analysis",
        path: "/variance-analysis",
        description: "Phân tích chênh lệch chi tiết",
        features: [
          "Price vs Volume variance",
          "Mix variance",
          "Drill-down theo category",
        ],
        dataSource: "budgets, revenues, expenses",
      },
    ],
  },
  {
    id: "risk",
    title: "Rủi ro & Tuân thủ",
    icon: <Shield className="h-5 w-5" />,
    description: "Quản lý rủi ro và giám sát tuân thủ",
    pages: [
      {
        name: "Risk Dashboard",
        path: "/risk-dashboard",
        description: "Bảng điều khiển rủi ro tổng hợp",
        features: [
          "Risk Score tổng hợp",
          "6 loại rủi ro: Liquidity, Credit, Market, Operational, Compliance, Strategic",
          "Stress Testing",
          "Monte Carlo Simulation",
        ],
        dataSource: "risk_scores, risk_alerts",
      },
      {
        name: "Alerts",
        path: "/alerts",
        description: "Quản lý cảnh báo",
        features: [
          "Cấu hình ngưỡng cảnh báo",
          "Thông báo Email/Slack",
          "Lịch sử cảnh báo",
        ],
        dataSource: "alerts, alert_settings",
      },
      {
        name: "Covenant Tracking",
        path: "/covenant-tracking",
        description: "Theo dõi điều khoản vay",
        features: [
          "Các chỉ số cam kết",
          "Trạng thái tuân thủ",
          "Cảnh báo vi phạm",
        ],
        dataSource: "bank_covenants",
      },
      {
        name: "Tax Compliance",
        path: "/tax-compliance",
        description: "Tuân thủ thuế",
        features: [
          "Theo dõi nghĩa vụ thuế",
          "Lịch nộp thuế",
          "Báo cáo thuế",
        ],
        dataSource: "tax_filings",
      },
    ],
  },
  {
    id: "reconciliation",
    title: "Đối soát",
    icon: <Calculator className="h-5 w-5" />,
    description: "Đối soát đơn hàng và thanh toán",
    pages: [
      {
        name: "Reconciliation Hub",
        path: "/reconciliation-hub",
        description: "Trung tâm đối soát e-commerce",
        features: [
          "Đối soát đơn hàng - vận chuyển",
          "Đối soát settlement",
          "Auto-match",
          "Xử lý chênh lệch",
        ],
        dataSource: "external_orders, shipping_orders, channel_settlements",
      },
    ],
  },
  {
    id: "capex",
    title: "Đầu tư & CAPEX",
    icon: <TrendingUp className="h-5 w-5" />,
    description: "Quản lý dự án đầu tư và phân bổ vốn",
    pages: [
      {
        name: "Capital Allocation",
        path: "/capital-allocation",
        description: "Phân bổ vốn đầu tư",
        features: [
          "Danh sách dự án CAPEX",
          "Budget vs Spent",
          "ROI dự kiến/thực tế",
          "Payback period",
        ],
        dataSource: "capex_projects",
      },
      {
        name: "Decision Support",
        path: "/decision-support",
        description: "Hỗ trợ ra quyết định đầu tư",
        features: [
          "NPV, IRR, Payback Analysis",
          "Sensitivity Analysis",
          "AI Decision Advisor",
          "Submit for Approval",
        ],
        dataSource: "decision_analyses",
      },
      {
        name: "Strategic Initiatives",
        path: "/strategic-initiatives",
        description: "Các sáng kiến chiến lược",
        features: [
          "Theo dõi tiến độ",
          "Milestone tracking",
          "Resource allocation",
        ],
        dataSource: "strategic_initiatives",
      },
    ],
  },
  {
    id: "settings",
    title: "Cài đặt & Quản trị",
    icon: <Settings className="h-5 w-5" />,
    description: "Cấu hình hệ thống và quản lý người dùng",
    pages: [
      {
        name: "Settings",
        path: "/settings",
        description: "Cài đặt chung",
        features: [
          "Thông tin công ty",
          "Cấu hình hệ thống",
          "Tích hợp bên ngoài",
        ],
        dataSource: "tenants, tenant_settings",
      },
      {
        name: "Data Hub",
        path: "/data-hub",
        description: "Trung tâm dữ liệu",
        features: [
          "Kết nối connector",
          "Import dữ liệu",
          "Đồng bộ tự động",
        ],
        dataSource: "connector_integrations",
      },
      {
        name: "Chart of Accounts",
        path: "/chart-of-accounts",
        description: "Hệ thống tài khoản kế toán",
        features: [
          "Danh mục tài khoản",
          "Cây tài khoản",
          "Mapping với báo cáo",
        ],
        dataSource: "gl_accounts",
      },
      {
        name: "Formula Settings",
        path: "/formula-settings",
        description: "Cấu hình công thức tính toán",
        features: [
          "Công thức KPI",
          "Tùy chỉnh cách tính",
        ],
        dataSource: "formula_settings",
      },
      {
        name: "RBAC",
        path: "/rbac",
        description: "Phân quyền người dùng",
        features: [
          "Vai trò (Role)",
          "Quyền truy cập",
          "Quản lý thành viên",
        ],
        dataSource: "tenant_members, roles",
      },
      {
        name: "Audit Log",
        path: "/audit-log",
        description: "Nhật ký hoạt động",
        features: [
          "Lịch sử thay đổi",
          "Ai làm gì, khi nào",
          "Truy vết",
        ],
        dataSource: "audit_logs",
      },
    ],
  },
];

const quickStartSteps = [
  {
    step: 1,
    title: "Kết nối nguồn dữ liệu",
    description: "Đi đến Data Hub để kết nối các nguồn dữ liệu: Shopee, Lazada, TikTok Shop, hoặc import file Excel/CSV.",
    path: "/data-hub",
  },
  {
    step: 2,
    title: "Thiết lập tài khoản ngân hàng",
    description: "Thêm thông tin tài khoản ngân hàng và nhập số dư hiện tại tại Bank Connections.",
    path: "/bank-connections",
  },
  {
    step: 3,
    title: "Nhập dữ liệu ban đầu",
    description: "Import hóa đơn, bills, và dữ liệu lịch sử. Xem hướng dẫn nhập liệu chi tiết.",
    path: "/data-entry-guide",
  },
  {
    step: 4,
    title: "Cấu hình cảnh báo",
    description: "Thiết lập các ngưỡng cảnh báo phù hợp với doanh nghiệp của bạn.",
    path: "/alerts",
  },
  {
    step: 5,
    title: "Tạo kế hoạch ngân sách",
    description: "Tạo budget cho năm tài chính và các kịch bản dự báo.",
    path: "/scenario-hub",
  },
];

export default function UserGuidePage() {
  return (
    <>
      <Helmet>
        <title>Hướng dẫn sử dụng | CFO Dashboard</title>
        <meta
          name="description"
          content="Hướng dẫn sử dụng chi tiết hệ thống CFO Dashboard - Quản lý tài chính doanh nghiệp"
        />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-3 rounded-xl bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Hướng dẫn sử dụng</h1>
            <p className="text-muted-foreground">
              Tài liệu hướng dẫn chi tiết các tính năng của hệ thống CFO Dashboard
            </p>
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="modules">Các module</TabsTrigger>
            <TabsTrigger value="quickstart">Bắt đầu nhanh</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Giới thiệu hệ thống</CardTitle>
                <CardDescription>
                  CFO Dashboard là hệ thống quản lý tài chính toàn diện cho doanh nghiệp
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <h4>Các nhóm chức năng chính:</h4>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 not-prose">
                  {guideSections.map((section) => (
                    <Card key={section.id} className="border-border/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {section.icon}
                          </div>
                          <CardTitle className="text-base">{section.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {section.pages.length} trang
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <h4 className="mt-6">Nguồn dữ liệu hỗ trợ:</h4>
                <ul>
                  <li><strong>E-commerce:</strong> Shopee, Lazada, TikTok Shop, Sendo</li>
                  <li><strong>Kế toán:</strong> MISA, Fast Accounting, SAP</li>
                  <li><strong>Ngân hàng:</strong> Kết nối trực tiếp hoặc import file</li>
                  <li><strong>File:</strong> Excel (.xlsx), CSV</li>
                  <li><strong>Data Warehouse:</strong> BigQuery</li>
                </ul>

                <h4>Các tính năng AI:</h4>
                <ul>
                  <li><strong>AI Insights:</strong> Phân tích tự động và đề xuất hành động</li>
                  <li><strong>Decision Advisor:</strong> Hỗ trợ ra quyết định đầu tư</li>
                  <li><strong>What-If Chatbot:</strong> Mô phỏng kịch bản bằng ngôn ngữ tự nhiên</li>
                  <li><strong>Budget Optimization:</strong> Đề xuất phân bổ ngân sách tối ưu</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-4">
            <Accordion type="single" collapsible className="space-y-2">
              {guideSections.map((section) => (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {section.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">{section.title}</div>
                        <div className="text-sm text-muted-foreground font-normal">
                          {section.description}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2 pb-4">
                      {section.pages.map((page, idx) => (
                        <Card key={idx} className="border-border/50">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                  {page.name}
                                  <Link to={page.path}>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                  </Link>
                                </CardTitle>
                                <CardDescription>{page.description}</CardDescription>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {page.path}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <h5 className="text-sm font-medium mb-2">Tính năng:</h5>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {page.features.map((feature, fIdx) => (
                                  <li key={fIdx} className="flex items-center gap-2">
                                    <ChevronRight className="h-3 w-3" />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {page.dataSource && (
                              <div>
                                <h5 className="text-sm font-medium mb-1">Nguồn dữ liệu:</h5>
                                <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                                  {page.dataSource}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          {/* Quick Start Tab */}
          <TabsContent value="quickstart" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bắt đầu nhanh trong 5 bước</CardTitle>
                <CardDescription>
                  Hướng dẫn thiết lập hệ thống lần đầu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quickStartSteps.map((item) => (
                    <div
                      key={item.step}
                      className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {item.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">{item.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                        <Link
                          to={item.path}
                          className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline"
                        >
                          Đi đến trang
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Lưu ý quan trọng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <h5 className="font-medium text-amber-600 dark:text-amber-400">
                    Về dữ liệu
                  </h5>
                  <p className="text-sm text-muted-foreground mt-1">
                    Hệ thống cần có dữ liệu để hiển thị. Nếu các trang trống, hãy import dữ liệu
                    hoặc kết nối nguồn dữ liệu tại Data Hub.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h5 className="font-medium text-blue-600 dark:text-blue-400">
                    Về quyền truy cập
                  </h5>
                  <p className="text-sm text-muted-foreground mt-1">
                    Một số tính năng yêu cầu quyền Admin hoặc Owner. Liên hệ quản trị viên nếu
                    bạn không thể truy cập một số trang.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h5 className="font-medium text-green-600 dark:text-green-400">
                    Hỗ trợ
                  </h5>
                  <p className="text-sm text-muted-foreground mt-1">
                    Truy cập trang Trợ giúp để xem FAQ hoặc liên hệ đội ngũ hỗ trợ.
                  </p>
                  <Link
                    to="/help"
                    className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline"
                  >
                    Đi đến Trợ giúp
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
