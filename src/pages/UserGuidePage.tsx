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
  PlayCircle,
  CheckCircle2,
  ArrowRight,
  Store,
  Factory,
  ShoppingBag,
  Building2,
  Lightbulb,
  MousePointerClick,
  Eye,
  Download,
  RefreshCw,
  Target,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useLanguage } from "@/contexts/LanguageContext";

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

interface Tutorial {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  videoPlaceholder?: string;
  steps: {
    title: string;
    description: string;
    tip?: string;
  }[];
}

interface UseCase {
  id: string;
  businessType: string;
  icon: React.ReactNode;
  description: string;
  challenges: string[];
  solutions: {
    feature: string;
    benefit: string;
  }[];
  keyMetrics: string[];
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

const detailedTutorials: Tutorial[] = [
  {
    id: "dashboard-kpi",
    title: "Dashboard & Đọc hiểu KPI",
    icon: <LayoutDashboard className="h-6 w-6" />,
    description: "Hướng dẫn chi tiết cách đọc hiểu các chỉ số KPI trên Dashboard và tùy chỉnh theo nhu cầu",
    videoPlaceholder: "Video hướng dẫn Dashboard sẽ được cập nhật",
    steps: [
      {
        title: "Truy cập CFO Dashboard",
        description: "Đăng nhập hệ thống → Dashboard chính hiển thị ngay lập tức. Đây là trang tổng quan với các KPI quan trọng nhất được hiển thị dạng card ở phía trên.",
        tip: "Dashboard tự động làm mới dữ liệu mỗi 5 phút. Nhấn nút Refresh để cập nhật ngay."
      },
      {
        title: "Hiểu các KPI chính",
        description: `
**Cash Today**: Số dư tiền mặt hiện tại từ tất cả tài khoản ngân hàng đã kết nối.

**Total AR (Accounts Receivable)**: Tổng công nợ phải thu từ khách hàng - là số tiền khách hàng còn nợ bạn.

**Overdue AR**: Phần công nợ đã quá hạn thanh toán - cần ưu tiên thu hồi.

**DSO (Days Sales Outstanding)**: Số ngày trung bình để thu được tiền từ khách hàng. DSO thấp = thu tiền nhanh = tốt.

**DPO (Days Payable Outstanding)**: Số ngày trung bình để thanh toán cho nhà cung cấp. DPO cao = giữ tiền lâu hơn.

**CCC (Cash Conversion Cycle)**: = DSO + DIO - DPO. Càng thấp càng tốt, thể hiện hiệu quả quản lý vốn lưu động.
        `,
        tip: "Click vào mỗi KPI card để xem chi tiết và drill-down."
      },
      {
        title: "Phân tích biểu đồ AR Aging",
        description: `Biểu đồ AR Aging phân chia công nợ theo thời gian quá hạn:
- **0-30 ngày**: Công nợ mới, bình thường
- **31-60 ngày**: Bắt đầu cần chú ý
- **61-90 ngày**: Cảnh báo - cần nhắc nợ tích cực  
- **>90 ngày**: Rủi ro cao - cần hành động ngay

Màu sắc từ xanh → đỏ thể hiện mức độ rủi ro tăng dần.`,
        tip: "Hover chuột lên từng cột để xem số tiền cụ thể."
      },
      {
        title: "Sử dụng AI Insights",
        description: "Panel AI Insights bên phải Dashboard cung cấp phân tích tự động và đề xuất hành động dựa trên dữ liệu thực. AI sẽ phát hiện các vấn đề và cơ hội, ví dụ: 'Công nợ quá hạn tăng 15% so với tháng trước - Đề xuất: Liên hệ 5 khách hàng có số dư lớn nhất'.",
        tip: "Click 'Xem chi tiết' trên mỗi insight để đi đến trang liên quan."
      },
      {
        title: "Lọc theo thời gian",
        description: "Sử dụng bộ lọc Date Range ở header để thay đổi khoảng thời gian phân tích. Có thể chọn: Hôm nay, 7 ngày, 30 ngày, Quý này, Năm này, hoặc tùy chỉnh.",
        tip: "Chọn khoảng thời gian phù hợp để so sánh xu hướng."
      },
    ],
  },
  {
    id: "scenario-whatif",
    title: "Scenario & What-If Analysis",
    icon: <GitBranch className="h-6 w-6" />,
    description: "Hướng dẫn tạo kịch bản tài chính, chạy mô phỏng What-If và import kết quả",
    videoPlaceholder: "Video hướng dẫn Scenario & What-If sẽ được cập nhật",
    steps: [
      {
        title: "Truy cập Scenario Hub",
        description: "Vào menu **Kịch bản & What-If** → Trang Scenario Hub hiển thị 2 tab chính: **Kịch bản tài chính** và **Mô phỏng What-If**.",
      },
      {
        title: "Tạo kịch bản mới",
        description: `Trong tab "Kịch bản tài chính":
1. Click nút **+ Tạo kịch bản mới**
2. Nhập tên kịch bản (VD: "Kế hoạch Q1 2025")
3. Chọn loại: Base (kịch bản gốc), Optimistic (lạc quan), Pessimistic (bi quan)
4. Nhập % tăng trưởng doanh thu dự kiến
5. Click **Lưu**`,
        tip: "Nên tạo ít nhất 3 kịch bản: Base, Best case, Worst case để so sánh."
      },
      {
        title: "Chỉnh sửa Monthly Plan",
        description: `Sau khi tạo kịch bản:
1. Click vào kịch bản để mở chi tiết
2. Chuyển sang tab **Kế hoạch**
3. Sử dụng bảng hoặc slider để điều chỉnh từng tháng:
   - Doanh thu dự kiến
   - Chi phí biến đổi
   - Chi phí cố định
4. Hệ thống tự động tính Lợi nhuận gộp và Net Profit`,
      },
      {
        title: "Sử dụng What-If Simulation",
        description: `Chuyển sang tab "Mô phỏng What-If":
1. Click **+ Mô phỏng mới** 
2. Điều chỉnh các tham số:
   - Tăng/giảm doanh thu %
   - Thay đổi chi phí %
   - Thêm chi phí mới
3. Xem ngay kết quả dự báo P&L
4. Dùng **Chatbot AI** để mô tả bằng ngôn ngữ tự nhiên: "Nếu doanh thu giảm 20%, lợi nhuận sẽ ra sao?"`,
        tip: "What-If Chatbot hiểu tiếng Việt. Thử hỏi: 'Cần tăng bao nhiêu doanh thu để đạt lợi nhuận 1 tỷ?'"
      },
      {
        title: "Import What-If vào Scenario",
        description: `Khi đã có kết quả What-If tốt:
1. Click nút **Import từ What-If** trên trang Scenario
2. Chọn kịch bản What-If muốn import
3. Đặt tên cho Scenario mới
4. Click **Import**

Kịch bản được tạo sẽ có Monthly Plan chi tiết theo kết quả What-If.`,
      },
      {
        title: "So sánh kịch bản",
        description: "Trong Scenario Hub, bật toggle **So sánh** để xem các kịch bản cạnh nhau. Biểu đồ sẽ hiển thị overlay để dễ so sánh doanh thu, chi phí, lợi nhuận giữa các kịch bản.",
      },
    ],
  },
  {
    id: "ecommerce-recon",
    title: "Đối soát E-commerce",
    icon: <ShoppingBag className="h-6 w-6" />,
    description: "Hướng dẫn đối soát đơn hàng và settlement với Shopee, Lazada, TikTok Shop",
    videoPlaceholder: "Video hướng dẫn Đối soát E-commerce sẽ được cập nhật",
    steps: [
      {
        title: "Kết nối kênh bán hàng",
        description: `Trước tiên, cần kết nối các kênh e-commerce:
1. Vào **Data Hub** → **Thêm kết nối**
2. Chọn nền tảng: Shopee, Lazada, TikTok Shop
3. Đăng nhập và cấp quyền truy cập
4. Hệ thống sẽ tự động đồng bộ đơn hàng`,
        tip: "Đồng bộ lần đầu có thể mất vài phút tùy số lượng đơn hàng."
      },
      {
        title: "Truy cập Reconciliation Hub",
        description: "Vào menu **Đối soát** → **Reconciliation Hub**. Trang này hiển thị tổng quan trạng thái đối soát của tất cả các kênh.",
      },
      {
        title: "Đối soát Đơn hàng - Vận chuyển",
        description: `Kiểm tra đơn hàng đã giao thành công:
1. Chọn kênh bán (VD: Shopee)
2. Chọn khoảng thời gian
3. Hệ thống so sánh:
   - Đơn hàng trên sàn
   - Trạng thái vận chuyển
   - Trạng thái thanh toán
4. Các đơn **Matched** (khớp) màu xanh, **Unmatched** (chưa khớp) màu vàng/đỏ`,
        tip: "Filter theo 'Unmatched' để xem nhanh các đơn cần xử lý."
      },
      {
        title: "Đối soát Settlement (Thanh toán từ sàn)",
        description: `Kiểm tra tiền sàn đã thanh toán:
1. Chọn tab **Settlement Reconciliation**
2. Import file settlement từ Shopee/Lazada (nếu chưa tự động)
3. Hệ thống so khớp:
   - Số tiền settlement từ sàn
   - Tổng giá trị đơn hàng - phí - hoàn - voucher
4. Xem **Variance** (chênh lệch) nếu có`,
      },
      {
        title: "Sử dụng Auto-match",
        description: `Để tiết kiệm thời gian:
1. Click nút **Auto-match**
2. Hệ thống tự động khớp các record dựa trên Order ID, số tiền
3. Xem tỷ lệ match thành công
4. Chỉ cần review thủ công các record không khớp`,
        tip: "Tỷ lệ auto-match >90% là bình thường. Nếu thấp hơn, kiểm tra lại dữ liệu nguồn."
      },
      {
        title: "Xử lý chênh lệch",
        description: `Với các record chênh lệch:
1. Click vào record để xem chi tiết
2. Xác định nguyên nhân: Phí sàn, Voucher, Hoàn hàng, Lỗi dữ liệu
3. Chọn action: Approve (chấp nhận), Dispute (khiếu nại), Adjust (điều chỉnh)
4. Thêm ghi chú nếu cần`,
      },
    ],
  },
  {
    id: "cash-forecast",
    title: "Dự báo Dòng tiền",
    icon: <Wallet className="h-6 w-6" />,
    description: "Hướng dẫn dự báo dòng tiền ngắn hạn và dài hạn, quản lý thanh khoản",
    videoPlaceholder: "Video hướng dẫn Dự báo Dòng tiền sẽ được cập nhật",
    steps: [
      {
        title: "Thiết lập tài khoản ngân hàng",
        description: `Trước tiên cần có số dư hiện tại:
1. Vào **Bank Connections**
2. Click **+ Thêm tài khoản**
3. Nhập: Tên ngân hàng, Số tài khoản, Số dư hiện tại
4. (Tùy chọn) Kết nối API ngân hàng để đồng bộ tự động`,
      },
      {
        title: "Xem Cash Forecast",
        description: `Vào **Dòng tiền** → **Cash Forecast**:
- **Daily View**: Dự báo theo ngày (30 ngày tới)
- **Weekly View**: Dự báo theo tuần (12 tuần tới)

Biểu đồ hiển thị:
- **Opening Balance**: Số dư đầu kỳ
- **Inflows**: Tiền vào (thu từ AR, thu khác)
- **Outflows**: Tiền ra (thanh toán AP, chi lương, chi khác)
- **Closing Balance**: Số dư cuối kỳ`,
      },
      {
        title: "Hiểu nguồn dữ liệu dự báo",
        description: `Hệ thống dự báo dựa trên:
1. **AR Due**: Hóa đơn sắp đến hạn → Dự báo tiền vào
2. **AP Due**: Bills sắp đến hạn → Dự báo tiền ra
3. **Recurring**: Chi phí định kỳ (lương, thuê, điện nước)
4. **Historical Trend**: Xu hướng thu/chi trong quá khứ`,
        tip: "Độ chính xác dự báo phụ thuộc vào chất lượng dữ liệu AR/AP. Cập nhật hóa đơn đầy đủ để có dự báo tốt hơn."
      },
      {
        title: "Chọn phương pháp dự báo",
        description: `Toggle giữa 2 phương pháp:
- **Document-based**: Dựa trên hóa đơn/bills cụ thể - chính xác hơn cho ngắn hạn
- **AI/Historical**: Dựa trên AI và xu hướng lịch sử - phù hợp cho dài hạn

Chọn phương pháp phù hợp với mục đích sử dụng.`,
      },
      {
        title: "Cảnh báo thiếu hụt",
        description: `Hệ thống tự động cảnh báo khi:
- Số dư dự kiến < 0 (Nguy hiểm - màu đỏ)
- Số dư < Ngưỡng an toàn (Cảnh báo - màu vàng)

Thiết lập ngưỡng an toàn tại **Alerts** → **Cash Alert Config**.`,
        tip: "Đặt ngưỡng an toàn = 1-2 tháng chi phí hoạt động."
      },
      {
        title: "Báo cáo Cash Flow Direct",
        description: `Để xem báo cáo dòng tiền theo chuẩn kế toán:
1. Vào **Cash Flow Direct**
2. Chọn kỳ báo cáo (tháng/quý/năm)
3. Xem dòng tiền chia theo:
   - **Hoạt động kinh doanh**: Thu từ KH, Chi cho NCC, Chi lương...
   - **Hoạt động đầu tư**: Mua/bán tài sản cố định
   - **Hoạt động tài chính**: Vay/trả nợ, cổ tức`,
      },
    ],
  },
  {
    id: "risk-dashboard",
    title: "Quản lý Rủi ro & Stress Testing",
    icon: <Shield className="h-6 w-6" />,
    description: "Hướng dẫn sử dụng Risk Dashboard, theo dõi các loại rủi ro và chạy mô phỏng Monte Carlo",
    videoPlaceholder: "Video hướng dẫn Risk Dashboard sẽ được cập nhật",
    steps: [
      {
        title: "Truy cập Risk Dashboard",
        description: "Vào menu **Rủi ro** → **Risk Dashboard**. Trang này hiển thị tổng quan 6 loại rủi ro chính của doanh nghiệp.",
      },
      {
        title: "Hiểu 6 loại rủi ro",
        description: `Hệ thống phân tích và chấm điểm 6 loại rủi ro:

**1. Liquidity Risk (Rủi ro thanh khoản)**: Cash runway, Current ratio
- Đỏ: Cash runway < 3 tháng

**2. Credit Risk (Rủi ro tín dụng)**: AR quá hạn, Customer concentration  
- Đỏ: AR overdue > 30% hoặc top 1 customer > 40%

**3. Market Risk (Rủi ro thị trường)**: Biến động doanh thu, Channel concentration
- Đỏ: Revenue volatility > 25%

**4. Operational Risk (Rủi ro vận hành)**: Inventory aging, Supplier dependency
- Đỏ: Slow-moving inventory > 20%

**5. Compliance Risk (Rủi ro tuân thủ)**: Covenant status, Tax compliance
- Đỏ: Có covenant vi phạm

**6. Strategic Risk (Rủi ro chiến lược)**: Gross margin trend, Market share`,
        tip: "Hover vào từng loại rủi ro để xem chi tiết các chỉ số thành phần."
      },
      {
        title: "Xem Risk Score tổng hợp",
        description: `Risk Score tổng hợp (0-100) được tính từ trung bình có trọng số 6 loại rủi ro:
- **0-25**: Rủi ro thấp (Xanh)
- **26-50**: Rủi ro trung bình (Vàng)  
- **51-75**: Rủi ro cao (Cam)
- **76-100**: Rủi ro rất cao (Đỏ)`,
      },
      {
        title: "Sử dụng Stress Testing",
        description: `Chạy stress test để xem công ty chịu được shock thế nào:
1. Chọn loại stress test: Revenue drop, Cost spike, AR delay
2. Điều chỉnh mức độ shock (VD: -20% revenue)
3. Xem kết quả: Cash runway còn bao lâu, tháng nào hết tiền
4. So sánh Base case vs Stressed case`,
        tip: "Chạy stress test định kỳ hàng quý để chuẩn bị contingency plan."
      },
      {
        title: "Monte Carlo Simulation",
        description: `Mô phỏng Monte Carlo chạy hàng nghìn kịch bản ngẫu nhiên:
1. Click **Run Monte Carlo**
2. Chọn số lần mô phỏng (1,000 - 10,000)
3. Xem phân phối xác suất kết quả EBITDA
4. Các percentile quan trọng: P10 (pessimistic), P50 (most likely), P90 (optimistic)`,
        tip: "P10 là kịch bản xấu nhất có 10% xác suất xảy ra - dùng để lập kế hoạch dự phòng."
      },
      {
        title: "Thiết lập cảnh báo rủi ro",
        description: `Cấu hình tự động thông báo khi rủi ro vượt ngưỡng:
1. Vào **Alerts** → **Risk Alerts**
2. Bật/tắt từng loại cảnh báo
3. Thiết lập ngưỡng (VD: Cash runway < 4 tháng → Cảnh báo)
4. Chọn kênh nhận: Email, Slack, Push notification`,
      },
    ],
  },
  {
    id: "channel-analytics",
    title: "Phân tích Kênh bán hàng",
    icon: <BarChart3 className="h-6 w-6" />,
    description: "Hướng dẫn phân tích hiệu quả từng kênh bán hàng và tối ưu chi phí",
    videoPlaceholder: "Video hướng dẫn Channel Analytics sẽ được cập nhật",
    steps: [
      {
        title: "Kết nối các kênh bán hàng",
        description: `Trước tiên cần kết nối dữ liệu từ các kênh:
1. Vào **Data Hub** → **Add Connector**
2. Chọn kênh: Shopee, Lazada, TikTok Shop, Website, Offline
3. Authorize và đồng bộ dữ liệu
4. Hệ thống tự động import: Orders, Fees, Settlements`,
        tip: "Kết nối càng nhiều kênh, báo cáo tổng hợp càng chính xác."
      },
      {
        title: "Xem Channel Analytics",
        description: `Vào **Doanh thu** → **Channel Analytics**:
- **Overview**: Doanh thu tổng và % contribution từng kênh
- **Fee Breakdown**: Chi phí theo loại (Commission, Payment, Shipping, Ads)
- **Trend Chart**: Xu hướng doanh thu theo thời gian

Biểu đồ hình tròn cho thấy kênh nào đóng góp nhiều nhất.`,
      },
      {
        title: "Phân tích chi phí từng kênh",
        description: `Click vào từng kênh để xem chi tiết chi phí:
- **Commission Fee**: Phí hoa hồng sàn (thường 3-15%)
- **Payment Fee**: Phí thanh toán (COD, e-wallet)
- **Shipping Fee**: Chi phí vận chuyển (nếu bạn chịu)
- **Ads Fee**: Chi phí quảng cáo trên sàn
- **Voucher**: Voucher do bạn tài trợ
- **Other Deductions**: Các khoản trừ khác`,
        tip: "Commission rate khác nhau theo category sản phẩm. Kiểm tra xem bạn có đang bán category phí cao không."
      },
      {
        title: "So sánh Gross Margin by Channel",
        description: `Tab **Channel P&L** hiển thị lãi gộp thực sự từng kênh:

**Gross Margin = (Revenue - COGS - Channel Fees) / Revenue**

Ví dụ:
- Shopee: Revenue 100tr, COGS 60tr, Fees 15tr → GM = 25%
- Website: Revenue 50tr, COGS 30tr, Fees 2tr → GM = 36%

→ Website margin cao hơn dù doanh thu thấp hơn.`,
        tip: "Kênh có GM < 15% cần xem xét giảm chi phí hoặc tăng giá."
      },
      {
        title: "Tối ưu Channel Mix",
        description: `Dựa trên phân tích, đưa ra quyết định:
1. **Tăng đầu tư**: Kênh GM cao, có tiềm năng tăng trưởng
2. **Tối ưu chi phí**: Kênh GM thấp, đàm phán lại commission
3. **Giảm/dừng**: Kênh lỗ liên tục, không có giá trị branding

Dùng **What-If** để mô phỏng: "Nếu tăng budget Shopee 30%, GMV tăng bao nhiêu?"`,
      },
      {
        title: "Báo cáo All-Channels P&L",
        description: `Vào **Channel P&L** để xem báo cáo tổng hợp:
- P&L từng kênh cạnh nhau để so sánh
- Breakdown: Revenue → COGS → Gross Profit → Channel Fees → Net Contribution
- Export Excel để báo cáo Ban lãnh đạo`,
      },
    ],
  },
];

const useCases: UseCase[] = [
  {
    id: "fashion-retail",
    businessType: "Bán lẻ Thời trang (Quần áo, Giày dép, Phụ kiện)",
    icon: <ShoppingBag className="h-6 w-6" />,
    description: "Bán thời trang đa kênh: Cửa hàng, Shopee, Lazada, TikTok Shop, Instagram. Sản phẩm có nhiều size/màu, tồn kho theo mùa, tỷ lệ đổi trả cao.",
    challenges: [
      "Tồn kho nhiều SKU (size, màu sắc), khó quản lý hàng tồn theo mùa",
      "Tỷ lệ hoàn hàng/đổi size cao ảnh hưởng lợi nhuận thực",
      "Chi phí Flash Sale, Voucher lớn nhưng chưa đo được ROI",
      "Đối soát settlement phức tạp do nhiều mã giảm giá, freeship",
      "Dòng tiền bị kẹt trong tồn kho end-of-season",
    ],
    solutions: [
      {
        feature: "Channel P&L",
        benefit: "Báo cáo lãi/lỗ theo từng kênh sau khi trừ phí sàn, voucher, freeship - biết kênh nào thực sự có lãi"
      },
      {
        feature: "Reconciliation Hub",
        benefit: "Đối soát đơn hàng và settlement tự động, xử lý đúng các đơn hoàn/đổi trả"
      },
      {
        feature: "Inventory Aging",
        benefit: "Phát hiện hàng tồn lâu theo mùa, đề xuất markdown/sale để giải phóng vốn"
      },
      {
        feature: "Promotion ROI",
        benefit: "Đo lường hiệu quả từng chương trình Sale (11.11, 12.12, Black Friday...)"
      },
      {
        feature: "What-If Simulation",
        benefit: "Mô phỏng kịch bản discount khác nhau, tính toán điểm hòa vốn"
      },
    ],
    keyMetrics: ["Gross Margin by Channel", "Return Rate", "Inventory Turnover", "Promotion ROI", "Sell-through Rate"],
  },
  {
    id: "cosmetics-beauty",
    businessType: "Bán lẻ Mỹ phẩm & Làm đẹp",
    icon: <Store className="h-6 w-6" />,
    description: "Kinh doanh mỹ phẩm, skincare, makeup. Bán trên sàn TMĐT, livestream, và cửa hàng. Hàng có hạn sử dụng, cần quản lý batch/lot.",
    challenges: [
      "Sản phẩm có hạn sử dụng (expiry date), cần quản lý theo batch/lot",
      "Chi phí marketing (KOL, livestream, ads) lớn, chưa đo được hiệu quả",
      "Gift/Sample đi kèm ảnh hưởng tính toán lợi nhuận",
      "Khách hàng trung thành cần chương trình loyalty, nhưng chi phí cao",
      "Seasonal demand (Tết, 20/10, Valentine) cần dự báo tồn kho tốt",
    ],
    solutions: [
      {
        feature: "Channel Analytics",
        benefit: "Phân tích doanh thu/lợi nhuận theo từng kênh bán, bao gồm livestream"
      },
      {
        feature: "Inventory Aging",
        benefit: "Cảnh báo sản phẩm sắp hết hạn, đề xuất promotion trước khi expire"
      },
      {
        feature: "Cash Forecast",
        benefit: "Dự báo dòng tiền có tính mùa vụ (Tết, 8/3, 20/10, Valentine)"
      },
      {
        feature: "Promotion ROI",
        benefit: "Đo lường ROI của KOL, livestream, gift-with-purchase campaigns"
      },
      {
        feature: "Unit Economics",
        benefit: "Tính đúng lợi nhuận/đơn sau khi bao gồm chi phí sample, gift"
      },
    ],
    keyMetrics: ["Customer Acquisition Cost", "Average Order Value", "Expiry Loss Rate", "Repeat Purchase Rate", "Channel Contribution Margin"],
  },
  {
    id: "electronics-accessories",
    businessType: "Bán lẻ Điện thoại, Phụ kiện & Điện tử",
    icon: <Zap className="h-6 w-6" />,
    description: "Kinh doanh điện thoại, tablet, phụ kiện (ốp, sạc, tai nghe), đồ điện tử. Margin mỏng, cạnh tranh giá cao, tồn kho nhanh lỗi thời.",
    challenges: [
      "Margin rất mỏng (5-15%), cần tính đúng mọi chi phí",
      "Sản phẩm lỗi thời nhanh khi có model mới ra mắt",
      "Bảo hành/đổi trả ảnh hưởng dòng tiền",
      "Cạnh tranh giá khốc liệt trên các sàn TMĐT",
      "Vốn lớn kẹt trong tồn kho điện thoại giá cao",
    ],
    solutions: [
      {
        feature: "Channel P&L",
        benefit: "Tính chính xác profit margin từng kênh sau tất cả phí (commission, payment fee, shipping)"
      },
      {
        feature: "Inventory Aging",
        benefit: "Cảnh báo sớm hàng tồn kho, đề xuất giảm giá trước khi model mới ra mắt"
      },
      {
        feature: "Working Capital",
        benefit: "Tối ưu Cash Conversion Cycle, giảm vốn kẹt trong hàng tồn"
      },
      {
        feature: "Cash Forecast",
        benefit: "Dự báo dòng tiền, lên kế hoạch nhập hàng model mới"
      },
      {
        feature: "What-If Simulation",
        benefit: "Phân tích kịch bản giảm giá vs giữ margin khi cạnh tranh"
      },
    ],
    keyMetrics: ["Net Profit Margin", "Inventory Turnover Days", "Warranty Return Rate", "Cash Conversion Cycle", "Price Competitiveness Index"],
  },
  {
    id: "home-living",
    businessType: "Bán lẻ Đồ gia dụng & Nội thất",
    icon: <Building2 className="h-6 w-6" />,
    description: "Kinh doanh đồ gia dụng, nội thất, decor. Sản phẩm đa dạng giá trị, shipping phức tạp, tồn kho lớn.",
    challenges: [
      "Chi phí vận chuyển cao với đồ nội thất cồng kềnh",
      "Tồn kho lớn, chiếm diện tích kho bãi đáng kể",
      "Công nợ với đại lý/showroom cần quản lý chặt",
      "Doanh thu theo mùa (Tết, mùa cưới, mùa xây dựng)",
      "Mix sản phẩm đa dạng từ giá rẻ đến cao cấp",
    ],
    solutions: [
      {
        feature: "AR Operations",
        benefit: "Quản lý công nợ đại lý/showroom theo aging, tự động nhắc nợ"
      },
      {
        feature: "Channel Analytics",
        benefit: "Phân tích lợi nhuận theo kênh, bao gồm chi phí shipping"
      },
      {
        feature: "Inventory Aging",
        benefit: "Quản lý hàng tồn kho theo danh mục, xác định slow-moving items"
      },
      {
        feature: "Rolling Forecast",
        benefit: "Dự báo doanh thu có tính mùa vụ, lập kế hoạch nhập hàng"
      },
      {
        feature: "Budget vs Actual",
        benefit: "So sánh ngân sách với thực tế theo từng category sản phẩm"
      },
    ],
    keyMetrics: ["Shipping Cost per Order", "DSO (Days Sales Outstanding)", "Inventory Value by Category", "Seasonal Revenue Index", "Warehouse Utilization"],
  },
  {
    id: "fnb-retail",
    businessType: "F&B - Đồ uống & Thực phẩm",
    icon: <Store className="h-6 w-6" />,
    description: "Quán cà phê, trà sữa, nhà hàng, đồ ăn nhanh, thực phẩm đóng gói. Bán qua cửa hàng, delivery apps (GrabFood, ShopeeFood, GoFood), và online.",
    challenges: [
      "Nguyên liệu dễ hỏng, cần quản lý stock chặt chẽ theo ngày",
      "Chi phí delivery app cao (20-30% commission), ăn mòn lợi nhuận",
      "Doanh thu biến động theo giờ trong ngày, khó dự báo",
      "Cash flow hàng ngày từ nhiều nguồn: Tiền mặt, App, Momo, Card",
      "Seasonal peaks (Tết, mùa hè, lễ hội) cần chuẩn bị nhân sự và nguyên liệu",
    ],
    solutions: [
      {
        feature: "Channel Analytics",
        benefit: "Phân tích lãi lỗ thực sự từng kênh: Dine-in vs Takeaway vs GrabFood vs ShopeeFood"
      },
      {
        feature: "Cash Flow Direct",
        benefit: "Theo dõi dòng tiền hàng ngày từ tất cả nguồn, đối soát với POS/App"
      },
      {
        feature: "Inventory Aging",
        benefit: "Cảnh báo nguyên liệu sắp hết hạn, giảm waste và improve food cost"
      },
      {
        feature: "Cash Forecast",
        benefit: "Dự báo cash flow theo pattern hàng tuần, chuẩn bị tiền mặt đủ cho peak hours"
      },
      {
        feature: "Unit Economics",
        benefit: "Tính cost-per-drink/dish chính xác bao gồm delivery fee, packaging"
      },
    ],
    keyMetrics: ["Food Cost %", "Beverage Cost %", "Revenue per Seat/Hour", "Delivery Commission Rate", "Waste Rate"],
  },
  {
    id: "pharmacy-health",
    businessType: "Nhà thuốc & Sản phẩm Sức khỏe",
    icon: <Building2 className="h-6 w-6" />,
    description: "Nhà thuốc, cửa hàng thực phẩm chức năng, thiết bị y tế. Bán tại quầy, online, và qua các sàn TMĐT. Hàng hóa cần quản lý hạn dùng và nguồn gốc.",
    challenges: [
      "Quản lý hạn sử dụng (expiry date) bắt buộc theo quy định dược",
      "Nhiều SKU từ nhiều nhà cung cấp, khó quản lý giá nhập và margin",
      "Thanh toán BHYT cần đối soát phức tạp",
      "Tồn kho thuốc theo mùa (cúm mùa đông, dị ứng mùa xuân...)",
      "Chi phí nhân viên dược sĩ cao, cần tối ưu hiệu quả bán hàng",
    ],
    solutions: [
      {
        feature: "Inventory Aging",
        benefit: "Quản lý expiry date, cảnh báo trước 3-6 tháng để promotion giải phóng"
      },
      {
        feature: "Channel P&L",
        benefit: "Phân tích lợi nhuận: Bán trực tiếp vs Online vs Sỉ cho phòng khám"
      },
      {
        feature: "Working Capital",
        benefit: "Tối ưu DIO cho thuốc, giảm vốn kẹt trong tồn kho slow-moving"
      },
      {
        feature: "Cash Conversion Cycle",
        benefit: "Quản lý công nợ nhà cung cấp dược phẩm, tận dụng payment terms"
      },
      {
        feature: "Promotion ROI",
        benefit: "Đánh giá hiệu quả các chương trình khuyến mãi theo category (OTC, TPCN, Mỹ phẩm)"
      },
    ],
    keyMetrics: ["Inventory Turnover by Category", "Expiry Loss Rate", "Gross Margin by Supplier", "Prescription vs OTC Ratio", "Average Basket Size"],
  },
  {
    id: "furniture-homeware",
    businessType: "Nội thất & Đồ gia dụng",
    icon: <Factory className="h-6 w-6" />,
    description: "Bán nội thất, đồ trang trí, đồ gia dụng. Sản phẩm giá trị cao, chu kỳ bán chậm, chi phí vận chuyển/lắp đặt lớn.",
    challenges: [
      "Sản phẩm giá trị cao, tồn kho lớn chiếm dụng vốn nhiều",
      "Chu kỳ bán hàng dài (khách xem showroom → quyết định → mua)",
      "Chi phí vận chuyển và lắp đặt cao, khó tính vào giá bán",
      "Tỷ lệ đổi trả do sản phẩm không vừa không gian",
      "Seasonal (nhà mới, cưới hỏi, Tết) cần dự trữ hàng trước",
    ],
    solutions: [
      {
        feature: "Cash Forecast",
        benefit: "Dự báo dòng tiền với chu kỳ dài, tính cả đặt cọc và thanh toán khi giao"
      },
      {
        feature: "Unit Economics",
        benefit: "Tính full cost mỗi đơn hàng: Giá vốn + Vận chuyển + Lắp đặt + Bảo hành"
      },
      {
        feature: "Working Capital",
        benefit: "Quản lý vốn lưu động với hàng tồn giá trị cao, tối ưu DIO"
      },
      {
        feature: "What-If Simulation",
        benefit: "Mô phỏng kịch bản: Nhập thêm container vs Made-to-order"
      },
      {
        feature: "Scenario Planning",
        benefit: "Lập kế hoạch nhập hàng theo mùa cao điểm (Tết, mùa cưới)"
      },
    ],
    keyMetrics: ["Inventory Days", "Revenue per Sqm Showroom", "Installation Cost Ratio", "Return Rate", "Deposit-to-Delivery Conversion"],
  },
];

const quickStartSteps = [
  {
    step: 1,
    title: "Kết nối nguồn dữ liệu",
    description: "Đi đến Data Hub để kết nối các nguồn dữ liệu: Shopee, Lazada, TikTok Shop, hoặc import file Excel/CSV.",
    path: "/data-hub",
    icon: <Database className="h-5 w-5" />,
  },
  {
    step: 2,
    title: "Thiết lập tài khoản ngân hàng",
    description: "Thêm thông tin tài khoản ngân hàng và nhập số dư hiện tại tại Bank Connections.",
    path: "/bank-connections",
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    step: 3,
    title: "Nhập dữ liệu ban đầu",
    description: "Import hóa đơn, bills, và dữ liệu lịch sử. Xem hướng dẫn nhập liệu chi tiết.",
    path: "/data-entry-guide",
    icon: <Download className="h-5 w-5" />,
  },
  {
    step: 4,
    title: "Cấu hình cảnh báo",
    description: "Thiết lập các ngưỡng cảnh báo phù hợp với doanh nghiệp của bạn.",
    path: "/alerts",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  {
    step: 5,
    title: "Tạo kế hoạch ngân sách",
    description: "Tạo budget cho năm tài chính và các kịch bản dự báo.",
    path: "/scenario-hub",
    icon: <Target className="h-5 w-5" />,
  },
];

export default function UserGuidePage() {
  const { t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{t('userGuide.pageTitle')}</title>
        <meta
          name="description"
          content={t('userGuide.pageDesc')}
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
            <h1 className="text-2xl md:text-3xl font-bold">{t('userGuide.title')}</h1>
            <p className="text-muted-foreground">
              {t('userGuide.subtitle')}
            </p>
          </div>
        </motion.div>

        <Tabs defaultValue="tutorials" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="tutorials" className="gap-2">
              <PlayCircle className="h-4 w-4" />
              {t('userGuide.tabTutorials')}
            </TabsTrigger>
            <TabsTrigger value="usecases" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              {t('userGuide.tabUseCases')}
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2">
              <Eye className="h-4 w-4" />
              {t('userGuide.tabOverview')}
            </TabsTrigger>
            <TabsTrigger value="modules" className="gap-2">
              <Database className="h-4 w-4" />
              {t('userGuide.tabModules')}
            </TabsTrigger>
            <TabsTrigger value="quickstart" className="gap-2">
              <Zap className="h-4 w-4" />
              {t('userGuide.tabQuickStart')}
            </TabsTrigger>
          </TabsList>

          {/* Detailed Tutorials Tab */}
          <TabsContent value="tutorials" className="space-y-6">
            <div className="grid gap-6">
              {detailedTutorials.map((tutorial) => (
                <Card key={tutorial.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        {tutorial.icon}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">{tutorial.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {tutorial.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {/* Video Placeholder */}
                    {tutorial.videoPlaceholder && (
                      <div className="mb-6">
                        <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
                          <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted to-muted/50">
                            <div className="text-center">
                              <PlayCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-2" />
                              <p className="text-muted-foreground text-sm">
                                {t('userGuide.videoPlaceholder')}
                              </p>
                            </div>
                          </div>
                        </AspectRatio>
                      </div>
                    )}

                    {/* Steps */}
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <MousePointerClick className="h-4 w-4 text-primary" />
                        {t('userGuide.steps')}
                      </h4>
                      <div className="space-y-4">
                        {tutorial.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="relative pl-8 pb-4 last:pb-0"
                          >
                            {/* Connector line */}
                            {idx < tutorial.steps.length - 1 && (
                              <div className="absolute left-[11px] top-8 w-0.5 h-full bg-border" />
                            )}
                            
                            {/* Step number */}
                            <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </div>
                            
                            <div className="space-y-2">
                              <h5 className="font-medium">{step.title}</h5>
                              <div className="text-sm text-muted-foreground whitespace-pre-line">
                                {step.description}
                              </div>
                              {step.tip && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-amber-700 dark:text-amber-300">
                                    <strong>{t('userGuide.tip')}:</strong> {step.tip}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Use Cases Tab */}
          <TabsContent value="usecases" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Use Cases theo loại Doanh nghiệp
                </CardTitle>
                <CardDescription>
                  Xem cách hệ thống CFO Dashboard giải quyết các thách thức cụ thể của từng loại hình doanh nghiệp
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-6">
              {useCases.map((useCase) => (
                <Card key={useCase.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        {useCase.icon}
                      </div>
                      <div>
                        <CardTitle>{useCase.businessType}</CardTitle>
                        <CardDescription className="mt-1">
                          {useCase.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Challenges */}
                    <div>
                      <h4 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {t('userGuide.challenges')}
                      </h4>
                      <ul className="space-y-2">
                        {useCase.challenges.map((challenge, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-destructive mt-1">•</span>
                            {challenge}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Solutions */}
                    <div>
                      <h4 className="font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {t('userGuide.howWeHelp')}
                      </h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        {useCase.solutions.map((solution, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border bg-green-500/5 border-green-500/20"
                          >
                            <div className="font-medium text-sm text-green-700 dark:text-green-300">
                              {solution.feature}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {solution.benefit}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        {t('userGuide.keyMetrics')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {useCase.keyMetrics.map((metric, idx) => (
                          <Badge key={idx} variant="secondary">
                            {metric}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

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
                          {section.pages.length} {t('userGuide.pages')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <h4 className="mt-6">{t('userGuide.dataSources')}</h4>
                <ul>
                  <li><strong>E-commerce:</strong> Shopee, Lazada, TikTok Shop, Sendo</li>
                  <li><strong>Kế toán:</strong> MISA, Fast Accounting, SAP</li>
                  <li><strong>Ngân hàng:</strong> Kết nối trực tiếp hoặc import file</li>
                  <li><strong>File:</strong> Excel (.xlsx), CSV</li>
                  <li><strong>Data Warehouse:</strong> BigQuery</li>
                </ul>

                <h4>{t('userGuide.aiFeatures')}</h4>
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
                              <h5 className="text-sm font-medium mb-2">{t('userGuide.features')}:</h5>
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
                                <h5 className="text-sm font-medium mb-1">{t('userGuide.dataSource')}:</h5>
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
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  {t('userGuide.quickStartTitle')}
                </CardTitle>
                <CardDescription>
                  {t('userGuide.quickStartDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quickStartSteps.map((item) => (
                    <div
                      key={item.step}
                      className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {t('userGuide.step')} {item.step}
                          </Badge>
                          <h4 className="font-semibold">{item.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                        <Link
                          to={item.path}
                          className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline"
                        >
                          {t('userGuide.goToPage')}
                          <ArrowRight className="h-3 w-3" />
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
                  {t('userGuide.importantNotes')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <h5 className="font-medium text-amber-600 dark:text-amber-400">
                    {t('userGuide.aboutData')}
                  </h5>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('userGuide.aboutDataDesc')}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h5 className="font-medium text-blue-600 dark:text-blue-400">
                    {t('userGuide.aboutAccess')}
                  </h5>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('userGuide.aboutAccessDesc')}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h5 className="font-medium text-green-600 dark:text-green-400">
                    {t('userGuide.support')}
                  </h5>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('userGuide.supportDesc')}
                  </p>
                  <Link
                    to="/help"
                    className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline"
                  >
                    {t('userGuide.goToHelp')}
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
