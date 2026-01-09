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
];

const useCases: UseCase[] = [
  {
    id: "ecommerce",
    businessType: "Doanh nghiệp E-commerce / Bán hàng Online",
    icon: <ShoppingBag className="h-6 w-6" />,
    description: "Bán hàng đa kênh trên Shopee, Lazada, TikTok Shop, Website riêng. Cần quản lý đơn hàng, đối soát với sàn, và phân tích lợi nhuận theo kênh.",
    challenges: [
      "Đối soát settlement với các sàn TMĐT mất nhiều thời gian",
      "Không biết kênh nào thực sự có lãi sau khi trừ phí",
      "Khó dự báo dòng tiền do payout từ sàn không đều",
      "Promotion ROI không rõ ràng",
    ],
    solutions: [
      {
        feature: "Reconciliation Hub",
        benefit: "Tự động đối soát đơn hàng và settlement, giảm 80% thời gian thủ công"
      },
      {
        feature: "Channel P&L",
        benefit: "Báo cáo lãi/lỗ theo từng kênh sau khi trừ tất cả phí"
      },
      {
        feature: "Cash Forecast",
        benefit: "Dự báo payout từ sàn dựa trên settlement cycle"
      },
      {
        feature: "Promotion ROI",
        benefit: "Đo lường hiệu quả từng chương trình khuyến mãi"
      },
    ],
    keyMetrics: ["Gross Margin by Channel", "Settlement Accuracy", "Promotion ROI", "Cash Conversion Cycle"],
  },
  {
    id: "manufacturing",
    businessType: "Doanh nghiệp Sản xuất / Phân phối",
    icon: <Factory className="h-6 w-6" />,
    description: "Sản xuất hoặc phân phối sản phẩm cho đại lý, nhà bán lẻ. Công nợ lớn, inventory đáng kể, cần quản lý vốn lưu động chặt chẽ.",
    challenges: [
      "Công nợ khách hàng lớn, nhiều khách trả chậm",
      "Tồn kho cao, dòng tiền bị kẹt trong hàng hóa",
      "Cần theo dõi Covenant với ngân hàng",
      "Chi phí sản xuất biến động, khó dự báo margin",
    ],
    solutions: [
      {
        feature: "AR Operations",
        benefit: "Quản lý công nợ theo aging, tự động nhắc nợ"
      },
      {
        feature: "Inventory Aging",
        benefit: "Phát hiện hàng tồn lâu, đề xuất giải phóng vốn"
      },
      {
        feature: "Covenant Tracking",
        benefit: "Theo dõi các chỉ số cam kết với ngân hàng real-time"
      },
      {
        feature: "Working Capital",
        benefit: "Tối ưu CCC (Cash Conversion Cycle)"
      },
    ],
    keyMetrics: ["DSO", "DIO", "CCC", "Current Ratio", "Debt Covenant Compliance"],
  },
  {
    id: "retail",
    businessType: "Chuỗi Bán lẻ / F&B",
    icon: <Store className="h-6 w-6" />,
    description: "Có nhiều cửa hàng/chi nhánh, doanh thu hàng ngày, chi phí thuê mặt bằng và nhân sự lớn. Cần so sánh hiệu quả giữa các điểm bán.",
    challenges: [
      "Khó tổng hợp doanh thu từ nhiều cửa hàng",
      "Chi phí cố định cao (thuê, lương), cần dự báo break-even",
      "So sánh hiệu quả giữa các chi nhánh phức tạp",
      "Dòng tiền dao động theo mùa/ngày lễ",
    ],
    solutions: [
      {
        feature: "Channel Analytics",
        benefit: "Phân tích doanh thu, chi phí theo từng cửa hàng"
      },
      {
        feature: "Budget vs Actual",
        benefit: "So sánh ngân sách vs thực tế theo chi nhánh"
      },
      {
        feature: "Unit Economics",
        benefit: "Tính break-even, contribution margin từng điểm bán"
      },
      {
        feature: "Rolling Forecast",
        benefit: "Dự báo cuốn chiếu có tính mùa vụ"
      },
    ],
    keyMetrics: ["Revenue per Store", "Same-store Sales Growth", "Labor Cost %", "Gross Margin %"],
  },
  {
    id: "services",
    businessType: "Doanh nghiệp Dịch vụ / Agency",
    icon: <Building2 className="h-6 w-6" />,
    description: "Cung cấp dịch vụ tư vấn, marketing, IT... Doanh thu theo dự án/hợp đồng, chi phí chính là nhân sự. Công nợ theo tiến độ dự án.",
    challenges: [
      "Doanh thu không đều, phụ thuộc vào việc close deal",
      "Công nợ theo milestone, khó dự báo khi nào thu được",
      "Chi phí nhân sự cố định, revenue biến động",
      "Cần đánh giá profitability từng dự án/khách hàng",
    ],
    solutions: [
      {
        feature: "Invoice Tracking",
        benefit: "Theo dõi hóa đơn theo dự án, milestone"
      },
      {
        feature: "Cash Forecast",
        benefit: "Dự báo dòng tiền dựa trên pipeline dự án"
      },
      {
        feature: "P&L Report",
        benefit: "Phân tích margin theo dự án/khách hàng"
      },
      {
        feature: "Scenario Planning",
        benefit: "Lập kịch bản theo số deal close được"
      },
    ],
    keyMetrics: ["Revenue per Employee", "Project Profitability", "Client Concentration", "Cash Runway"],
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

        <Tabs defaultValue="tutorials" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="tutorials" className="gap-2">
              <PlayCircle className="h-4 w-4" />
              Hướng dẫn chi tiết
            </TabsTrigger>
            <TabsTrigger value="usecases" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Use Cases
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2">
              <Eye className="h-4 w-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="modules" className="gap-2">
              <Database className="h-4 w-4" />
              Các module
            </TabsTrigger>
            <TabsTrigger value="quickstart" className="gap-2">
              <Zap className="h-4 w-4" />
              Bắt đầu nhanh
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
                                {tutorial.videoPlaceholder}
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
                        Các bước thực hiện
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
                                    <strong>Mẹo:</strong> {step.tip}
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
                        Thách thức thường gặp
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
                        Giải pháp từ CFO Dashboard
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
                        KPI quan trọng cần theo dõi
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
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Bắt đầu nhanh trong 5 bước
                </CardTitle>
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
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Bước {item.step}
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
                          Đi đến trang
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
