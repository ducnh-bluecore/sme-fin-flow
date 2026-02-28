import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  Wallet,
  FileText,
  TrendingUp,
  RefreshCw,
  BarChart3,
  PieChart,
  Calculator,
  Building2,
  Receipt,
  CreditCard,
  Banknote,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Zap,
  Database,
  Layers,
  ShoppingCart,
  Truck,
  Store,
  Package,
  Shield,
  Users,
  Settings,
  Bell,
  Clock,
  LayoutDashboard,
  Brain,
  Landmark,
  Globe,
  BookOpen,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocFeature {
  name: string;
  description: string;
  formula?: string;
  tips?: string[];
}

interface DocSubSection {
  id: string;
  title: string;
  path: string;
  description: string;
  features: DocFeature[];
  useCases?: string[];
  dataLayer?: string;
  manifesto?: string[];
}

interface DocSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  subSections: DocSubSection[];
  crossModule?: string[];
}

// ─── Data Architecture ──────────────────────────────────────────────────────

const dataLayers = [
  { layer: 'L1', name: 'Foundation', tables: 'tenants, organizations, members, roles', purpose: 'Phân quyền, cấu trúc tổ chức, multi-tenant isolation' },
  { layer: 'L1.5', name: 'Ingestion', tables: 'ingestion_batches, data_watermarks', purpose: 'Theo dõi trạng thái nạp dữ liệu, watermark đồng bộ' },
  { layer: 'L2', name: 'Master Model', tables: 'cdp_orders, master_products, master_customers', purpose: 'Dữ liệu gốc SSOT — nguồn sự thật duy nhất' },
  { layer: 'L2.5', name: 'Events / Marketing', tables: 'commerce_events, campaigns, ad_spend_daily', purpose: 'Sự kiện thương mại và chi phí marketing' },
  { layer: 'L3', name: 'KPI Engine', tables: 'kpi_definitions, kpi_facts_daily, kpi_targets', purpose: 'Chỉ số đã tính sẵn, pre-aggregated cho dashboard' },
  { layer: 'L4', name: 'Alert / Decision', tables: 'alert_rules, alert_instances, decision_cards', purpose: 'Cảnh báo tự động và thẻ quyết định' },
  { layer: 'L5', name: 'AI Query', tables: 'ai_semantic_models, ai_conversations, ai_messages', purpose: 'AI phân tích dữ liệu bằng ngôn ngữ tự nhiên' },
  { layer: 'L6', name: 'Audit', tables: 'sync_jobs, audit_logs', purpose: 'Truy xuất lịch sử, đảm bảo compliance' },
  { layer: 'L10', name: 'BigQuery Sync', tables: 'bq_connections, sync_configs, bq_cache', purpose: 'Đồng bộ nguồn dữ liệu từ BigQuery / Data Warehouse' },
];

// ─── 10 Manifesto Principles ────────────────────────────────────────────────

const manifestoPrinciples = [
  { number: 1, title: 'KHÔNG PHẢI KẾ TOÁN', text: 'FDP phục vụ CEO/CFO điều hành, không nộp báo cáo thuế.' },
  { number: 2, title: 'SINGLE SOURCE OF TRUTH', text: '1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Không có phiên bản khác.' },
  { number: 3, title: 'TRUTH > FLEXIBILITY', text: 'Không cho tự định nghĩa metric, không chỉnh công thức tùy tiện, không "chọn số đẹp".' },
  { number: 4, title: 'REAL CASH', text: 'Phân biệt: Cash đã về / sẽ về / có nguy cơ không về / đang bị khóa (tồn kho, ads, ops).' },
  { number: 5, title: 'REVENUE ↔ COST', text: 'Mọi doanh thu đều đi kèm chi phí. Không có doanh thu "đứng một mình".' },
  { number: 6, title: 'UNIT ECONOMICS → ACTION', text: 'SKU lỗ + khóa cash + tăng risk → phải nói STOP.' },
  { number: 7, title: "TODAY'S DECISION", text: 'Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng.' },
  { number: 8, title: 'SURFACE PROBLEMS', text: 'Không làm đẹp số, không che anomaly, chỉ ra vấn đề sớm.' },
  { number: 9, title: 'FEED CONTROL TOWER', text: 'FDP là nguồn sự thật, Control Tower hành động dựa trên đó.' },
  { number: 10, title: 'FINAL TEST', text: 'Nếu không khiến quyết định rõ ràng hơn → FDP đã thất bại.' },
];

// ─── All 11 Menu Groups ─────────────────────────────────────────────────────

const fdpSections: DocSection[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 3.1 DECISION CENTER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'decision-center',
    title: '1. Decision Center',
    icon: Zap,
    description: 'Trung tâm ra quyết định — CEO mở app sáng, thấy ngay cần xử lý gì.',
    crossModule: ['Control Tower: Alert → Decision Card', 'MDP: Marketing risk decisions'],
    subSections: [
      {
        id: 'decision-cards',
        title: 'Decision Cards',
        path: '/decision-center',
        description: 'Thẻ quyết định được tự động sinh từ L4 Alert Layer khi KPI vượt ngưỡng.',
        dataLayer: 'L4 Alert/Decision → decision_cards',
        features: [
          { name: 'Auto-generated Cards', description: 'Hệ thống tự động tạo Decision Card khi alert_instances trigger. Mỗi card bao gồm: Impact Amount (mất bao nhiêu tiền), Deadline (còn bao lâu), Owner (ai chịu trách nhiệm).', tips: ['Card chỉ xuất hiện khi có hành động cần thực hiện — không có hành động = không có card', 'Tối đa 5-7 cards cùng lúc để tập trung'] },
          { name: 'Bluecore Scores Panel', description: 'Điểm tổng hợp sức khỏe doanh nghiệp: Revenue Score, Profit Score, Cash Score, Growth Score, Risk Score.' },
          { name: 'AI Decision Advisor', description: 'Chat inline với AI để phân tích sâu quyết định. AI dựa trên dữ liệu thật từ FDP, confidence score tối thiểu để đưa ra khuyến nghị.', tips: ['min_confidence_to_speak = 70% — AI im lặng nếu không đủ dữ liệu', 'Dựa trên decision_learning_patterns từ các quyết định trước'] },
          { name: 'Threshold Config', description: 'Tùy chỉnh ngưỡng cảnh báo cho từng KPI: Revenue drop %, Margin threshold, Cash runway days.' },
          { name: 'Decision Follow-up & Outcome', description: 'Theo dõi kết quả sau quyết định. Mỗi decision có lifecycle: Open → In Progress → Resolved → Outcome Measured.', tips: ['Default follow-up: 7 ngày', 'Outcome tracking giúp AI học pattern cho lần sau'] },
        ],
        useCases: ['CEO mở app sáng, thấy 3 decision cards cần xử lý, bấm "Act" để phân công', 'CFO review outcome của quyết định cắt giảm SKU lỗ tuần trước'],
        manifesto: ["TODAY'S DECISION — Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng"],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.2 CFO OVERVIEW (5 trang)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'cfo-overview',
    title: '2. CFO Overview',
    icon: LayoutDashboard,
    description: '5 trang tổng quan tài chính cho CFO — từ dashboard đến cash forecast.',
    crossModule: ['Control Tower: Cash alerts', 'MDP: Revenue attribution'],
    subSections: [
      {
        id: 'retail-command',
        title: 'a) Retail Command Center',
        path: '/dashboard',
        description: 'Tổng quan sức khỏe retail trên 1 màn hình duy nhất.',
        dataLayer: 'L3 KPI → v_fdp_truth_snapshot (Facade View)',
        features: [
          { name: 'RetailHealthHero', description: 'Header card hiển thị trạng thái sức khỏe tổng thể retail: Healthy / Warning / Critical.' },
          { name: 'MoneyEngineCards', description: 'Revenue, Net Profit, Cash Position — 3 số quan trọng nhất.', formula: 'Net Revenue = Gross Revenue - Returns - Discounts - Platform Fees\nNet Profit = Revenue - COGS - OPEX - Taxes\nCash Position = Bank Balance - Locked Cash' },
          { name: 'ChannelWarChart', description: 'So sánh performance giữa các kênh bán (Shopee, Lazada, TikTok, Website...) theo Revenue và Margin.' },
          { name: 'InventoryRiskPanel', description: 'Cảnh báo tồn kho: Dead stock value, aging >90 ngày, locked cash in inventory.' },
          { name: 'CashVelocityPanel', description: 'Tốc độ quay vòng tiền — Cash Conversion Cycle trend.', formula: 'CCC = DIO + DSO - DPO' },
          { name: 'RetailDecisionFeed', description: 'Feed quyết định real-time từ Decision Center — hiển thị 5 decisions gần nhất.' },
        ],
        useCases: ['CFO nhìn 1 màn hình biết "Retail machine đang khỏe hay đang chết ở đâu?"', 'Phát hiện kênh Lazada margin giảm 5% so với tuần trước ngay trên dashboard'],
        manifesto: ['SINGLE SOURCE OF TRUTH — 1 Net Revenue, 1 Contribution Margin, 1 Cash Position'],
      },
      {
        id: 'cash-position',
        title: 'b) Cash Position',
        path: '/cash-position',
        description: 'Bức tranh tiền thật: đã về, sẽ về, nguy cơ, bị khóa.',
        dataLayer: 'L2 Master + L3 KPI → cash metrics',
        features: [
          { name: 'Real Cash Breakdown', description: '4 loại tiền: Đã về tài khoản (Available) / Sẽ về (Expected from AR) / Nguy cơ không về (At Risk) / Đang bị khóa (Locked).', formula: 'Available Cash = Bank Balance\nExpected = Sum(AR × Collection Probability)\nAt Risk = AR > 90 days\nLocked = Inventory Value + Prepaid Ads + Ops Deposits' },
          { name: 'Locked Cash Drilldown', description: 'Chi tiết tiền bị khóa theo 4 nguồn: Inventory (tồn kho), Ads (prepaid quảng cáo), Ops (cọc, vận hành), Platform (tiền chờ settlement từ sàn).' },
          { name: 'Cash Runway', description: 'Số tháng còn hoạt động được với tốc độ đốt tiền hiện tại.', formula: 'Cash Runway = Available Cash / Average Monthly Burn Rate', tips: ['Runway < 1 tháng = Critical Alert 🔴', 'Runway < 3 tháng = Warning 🟡', 'Runway > 6 tháng = Healthy 🟢'] },
        ],
        useCases: ['"Còn bao nhiêu tiền thật? Bao nhiêu bị khóa trong tồn kho?"', '"Runway còn 2.5 tháng — cần hành động ngay!"'],
        manifesto: ['REAL CASH — Phân biệt tiền đã về, sẽ về, có nguy cơ, đang bị khóa'],
      },
      {
        id: 'cash-forecast',
        title: 'c) Cash Forecast',
        path: '/cash-forecast',
        description: 'Dự báo dòng tiền ngắn hạn và trung hạn.',
        dataLayer: 'L3 KPI + L2 AR/AP → forecast calculations',
        features: [
          { name: 'Daily Forecast View', description: 'Dự báo dòng tiền 7-30 ngày tới, từng ngày. Inflow từ AR collection, Outflow từ AP payments + fixed costs.' },
          { name: 'Weekly Forecast View', description: 'Dự báo 4-12 tuần, tổng hợp theo tuần cho tầm nhìn trung hạn.' },
          { name: 'Scenario Analysis', description: '3 kịch bản: Best case (thu nhanh, hoãn chi) / Base case (theo trend) / Worst case (thu chậm, chi đột biến).', formula: 'Best = Inflow × 1.1 - Outflow × 0.9\nBase = Inflow - Outflow\nWorst = Inflow × 0.8 - Outflow × 1.15' },
        ],
        useCases: ['"Tuần sau có đủ tiền trả lương không?"', '"Tháng 3 có gap không? Cần bridge financing?  "'],
      },
      {
        id: 'cash-flow-direct',
        title: 'd) Cash Flow Direct',
        path: '/cash-flow-direct',
        description: 'Dòng tiền trực tiếp theo phương pháp Direct Method.',
        dataLayer: 'L2 Master → bank transactions + invoices',
        features: [
          { name: 'Operating Cash Flow', description: 'Tiền từ hoạt động kinh doanh: Thu từ khách hàng - Chi cho NCC - Chi lương - Chi thuế.' },
          { name: 'Investing Cash Flow', description: 'Tiền đầu tư: Mua tài sản, đầu tư dài hạn.' },
          { name: 'Financing Cash Flow', description: 'Tiền tài trợ: Vay/trả nợ, góp vốn, chia lợi nhuận.' },
          { name: 'Waterfall Chart', description: 'Biểu đồ thác nước theo tháng — nhìn ngay tiền đi đâu, về đâu.' },
          { name: 'Period Comparison', description: 'So sánh cash flow giữa các kỳ (MoM, QoQ, YoY).' },
        ],
        useCases: ['"Tiền đi đâu? Operating positive hay negative?"', '"Cash from Operations tháng này so với tháng trước?"'],
      },
      {
        id: 'working-capital',
        title: 'e) Working Capital Hub',
        path: '/working-capital-hub',
        description: 'Tối ưu hóa vốn lưu động: Inventory, AR, AP.',
        dataLayer: 'L2 Master + L3 KPI',
        features: [
          { name: 'Working Capital Overview', description: 'DIO (Days Inventory Outstanding), DSO (Days Sales Outstanding), DPO (Days Payable Outstanding) — 3 chỉ số quyết định.', formula: 'DIO = (Avg Inventory / COGS) × 365\nDSO = (Avg AR / Revenue) × 365\nDPO = (Avg AP / COGS) × 365' },
          { name: 'Cash Conversion Cycle', description: 'CCC trend theo thời gian — mục tiêu giảm CCC.', formula: 'CCC = DIO + DSO - DPO\n→ CCC càng thấp, vốn quay càng nhanh', tips: ['CCC tăng = tiền bị khóa nhiều hơn', 'CCC < 0 = Doanh nghiệp dùng tiền NCC (mô hình marketplace)'] },
        ],
        useCases: ['"Mất bao nhiêu ngày để chuyển hàng thành tiền?"', '"CCC đang tăng 5 ngày so với quý trước — tại sao?"'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.3 STRATEGY & DECISION (3 trang)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'strategy-decision',
    title: '3. Strategy & Decision',
    icon: Target,
    description: '3 trang hỗ trợ chiến lược: Executive Summary, Risk, Decision Support.',
    subSections: [
      {
        id: 'executive-summary',
        title: 'a) Executive Summary',
        path: '/executive-summary',
        description: '1 trang tóm tắt cho CEO — đủ thông tin để họp board.',
        dataLayer: 'L3 KPI + L4 Alert → aggregated view',
        features: [
          { name: 'Health Score Radar', description: 'Radar chart 5 trục: Revenue, Profit, Cash, Growth, Risk — mỗi trục 0-100 điểm.' },
          { name: 'Cash Runway Status', description: 'Trạng thái runway với color coding: xanh/vàng/đỏ.' },
          { name: 'Risk Alerts Summary', description: 'Top 3 rủi ro lớn nhất đang active.' },
          { name: 'Pending Decisions Panel', description: 'Số decision cards đang chờ xử lý + deadline gần nhất.' },
        ],
        useCases: ['CEO chuẩn bị họp board, cần 1 trang tóm tắt toàn cảnh', '"Cho tôi executive summary để gửi nhà đầu tư"'],
      },
      {
        id: 'risk-dashboard',
        title: 'b) Risk Dashboard',
        path: '/risk-dashboard',
        description: 'Ma trận rủi ro và theo dõi giảm thiểu.',
        dataLayer: 'L4 Alert → risk categorization',
        features: [
          { name: 'Risk Matrix', description: 'Ma trận Impact × Probability — mỗi rủi ro được plot trên grid 5×5.' },
          { name: 'Risk Categories', description: '3 loại: Financial (margin, cash), Operational (inventory, supply chain), Market (competition, demand).' },
          { name: 'Mitigation Tracking', description: 'Mỗi rủi ro có Owner, Mitigation Plan, Status, Deadline.' },
        ],
        useCases: ['"Những rủi ro nào đang đe dọa doanh nghiệp?"', '"Rủi ro tồn kho expired đang ở mức Critical — ai đang xử lý?"'],
        manifesto: ['SURFACE PROBLEMS — Không làm đẹp số, không che anomaly, chỉ ra vấn đề sớm'],
      },
      {
        id: 'decision-support',
        title: 'c) Decision Support',
        path: '/decision-support',
        description: 'Công cụ phân tích hỗ trợ ra quyết định đầu tư.',
        dataLayer: 'L3 KPI + L5 AI → analysis engine',
        features: [
          { name: 'Hero Decision Card', description: 'Card quyết định lớn nhất đang pending — hiển thị nổi bật.' },
          { name: 'Scenario Sandbox', description: 'Điều chỉnh biến số (revenue ±%, cost ±%) và xem tác động real-time.' },
          { name: 'Sensitivity Heatmap', description: 'Ma trận nhiệt: biến số nào ảnh hưởng EBITDA nhiều nhất.' },
          { name: 'NPV/IRR Analysis', description: 'Phân tích Net Present Value và Internal Rate of Return cho các dự án đầu tư.', formula: 'NPV = Σ [CFt / (1+r)^t] - Initial Investment\nIRR = rate where NPV = 0' },
          { name: 'ROI Analysis', description: 'Phân tích Return on Investment với saved analyses để so sánh.', formula: 'ROI = (Gain - Cost) / Cost × 100%' },
          { name: 'AI Decision Advisor', description: 'AI phân tích sâu dựa trên dữ liệu thật — đưa ra khuyến nghị với confidence score.' },
        ],
        useCases: ['"Nên đầu tư 500tr vào kho mới không? ROI bao nhiêu?"', '"Nếu tăng giá 5% thì volume giảm bao nhiêu là hòa vốn?"'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.4 FINANCIAL REPORTS (6 trang)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'financial-reports',
    title: '4. Financial Reports',
    icon: FileText,
    description: '6 trang báo cáo tài chính: P&L, Analysis, Board Reports, Expenses, Revenue.',
    subSections: [
      {
        id: 'pl-report',
        title: 'a) P&L Report',
        path: '/pl-report',
        description: 'Báo cáo Lãi/Lỗ chi tiết — Revenue waterfall đến Net Income.',
        dataLayer: 'L3 KPI → kpi_facts_daily aggregated',
        features: [
          { name: 'Revenue Breakdown', description: 'Doanh thu phân tích theo kênh bán, nhóm sản phẩm, khu vực.' },
          { name: 'Cost Waterfall', description: 'Dòng chảy chi phí: Gross Revenue → Net Revenue → Gross Profit → EBITDA → Net Income.', formula: 'Gross Profit = Net Revenue - COGS\nEBITDA = Gross Profit - OPEX\nNet Income = EBITDA - D&A - Interest - Tax' },
          { name: 'Margin Analysis', description: 'Phân tích 3 mức margin: Gross, Operating, Net.', formula: 'Gross Margin = Gross Profit / Revenue × 100%\nOperating Margin = EBIT / Revenue × 100%\nNet Margin = Net Income / Revenue × 100%' },
          { name: 'Period Comparison', description: 'So sánh MoM, QoQ, YoY — highlight variance > 10%.' },
        ],
        useCases: ['"Tháng này lãi hay lỗ? Ở đâu?"', '"Gross margin giảm từ 35% xuống 28% — nguyên nhân?"'],
        manifesto: ['REVENUE ↔ COST — Mọi doanh thu đều đi kèm chi phí'],
      },
      {
        id: 'financial-analysis',
        title: 'b) Financial Analysis',
        path: '/financial-reports',
        description: 'Tổng hợp KPI tài chính với insights tự động.',
        dataLayer: 'L3 KPI → pre-calculated metrics',
        features: [
          { name: 'KPI Summary', description: 'Revenue, Margin, Costs — hiển thị actual vs target.' },
          { name: 'Financial Insights', description: 'Insights tự động (pre-generated) từ L5 AI: trend detection, anomaly detection.' },
          { name: 'Financial Ratios', description: 'Current Ratio, Quick Ratio, Debt/Equity — so sánh với target.', formula: 'Current Ratio = Current Assets / Current Liabilities\nQuick Ratio = (Current Assets - Inventory) / Current Liabilities' },
        ],
        useCases: ['"Các chỉ số tài chính có đạt target không?"'],
        manifesto: ['100% SSOT — Không tính toán ở client, mọi số lấy từ L3 KPI'],
      },
      {
        id: 'performance-analysis',
        title: 'c) Performance Analysis',
        path: '/performance-analysis',
        description: 'Budget vs Actual — phân tích biến động.',
        dataLayer: 'L3 KPI → kpi_targets vs kpi_facts_daily',
        features: [
          { name: 'Budget vs Actual', description: 'So sánh kế hoạch vs thực tế theo từng line item.' },
          { name: 'Variance Analysis', description: 'Phân tích biến động: Favorable vs Unfavorable, absolute vs percentage.', formula: 'Variance = Actual - Budget\nVariance % = (Actual - Budget) / Budget × 100%' },
        ],
        useCases: ['"Chi phí thực tế vượt kế hoạch bao nhiêu? Tại sao?"'],
      },
      {
        id: 'board-reports',
        title: 'd) Board Reports',
        path: '/board-reports',
        description: 'Auto-generate báo cáo cho Board of Directors.',
        dataLayer: 'L3 KPI + L4 Alert → PDF/export',
        features: [
          { name: 'Financial Summary', description: 'Tóm tắt P&L, Cash Position, Key Metrics cho board.' },
          { name: 'Risk Items', description: 'Top risks đang active — từ Risk Dashboard.' },
          { name: 'Strategic Initiatives', description: 'Progress update các sáng kiến chiến lược.' },
          { name: 'Export/Download', description: 'Xuất PDF với branding doanh nghiệp.' },
        ],
        useCases: ['"Tạo báo cáo cho board meeting tuần này"'],
      },
      {
        id: 'expenses',
        title: 'e) Expenses',
        path: '/expenses',
        description: 'Phân tích chi phí theo category và xu hướng.',
        dataLayer: 'L2 Master → bills + L3 KPI',
        features: [
          { name: 'Category Breakdown', description: 'Chi phí theo category: COGS, Marketing, Operations, HR, Admin, Others.' },
          { name: 'Daily Trend', description: 'Xu hướng chi phí hàng ngày — phát hiện đột biến.' },
          { name: 'Period Comparison', description: 'So sánh chi phí MoM — highlight tăng/giảm bất thường.' },
        ],
        useCases: ['"Chi phí marketing tăng bao nhiêu so với tháng trước?"', '"Chi phí logistics chiếm % doanh thu?"'],
      },
      {
        id: 'revenue',
        title: 'f) Revenue',
        path: '/revenue',
        description: 'Phân tích doanh thu theo kênh, sản phẩm, xu hướng.',
        dataLayer: 'L2 Master → cdp_orders + L3 KPI',
        features: [
          { name: 'Revenue by Channel', description: 'Doanh thu theo từng kênh bán hàng.' },
          { name: 'Revenue by Product', description: 'Top sản phẩm theo doanh thu và lợi nhuận.' },
          { name: 'Revenue Trend', description: 'Xu hướng doanh thu + growth rate.' },
          { name: 'Top Customers', description: 'Khách hàng mang lại doanh thu lớn nhất.' },
        ],
        useCases: ['"Kênh nào đang mang lại nhiều doanh thu nhất?"', '"Doanh thu tháng này tăng hay giảm?"'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.5 PLAN & SIMULATION (3 trang)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'plan-simulation',
    title: '5. Plan & Simulation',
    icon: TrendingUp,
    description: '3 trang mô phỏng và lập kế hoạch: What-If, Rolling Forecast, Strategic Initiatives.',
    subSections: [
      {
        id: 'scenario-hub',
        title: 'a) Scenario Hub (What-If)',
        path: '/scenario',
        description: 'Mô phỏng What-If với khung thời gian linh hoạt.',
        dataLayer: 'L3 KPI → v_fdp_truth_snapshot as baseline',
        features: [
          { name: 'Time Horizon Selector', description: 'Chọn khung thời gian: 1 tháng (1T), 3 tháng (3T), 6 tháng (6T), 1 năm (1N), 2 năm (2N).', tips: ['1T: Chart hiển thị theo tuần', '3T-24T: Chart hiển thị theo tháng', 'KPI cards tự động scale theo horizon'] },
          { name: 'Multi-variable Sliders', description: '5 biến điều chỉnh: Revenue %, COGS %, OPEX %, Price %, Volume % — thay đổi và xem tác động real-time.' },
          { name: 'Monthly Profit Trend Chart', description: 'Biểu đồ EBITDA trend dynamic theo time horizon đã chọn — so sánh Base vs What-If.' },
          { name: 'Save/Load Scenarios', description: 'Lưu scenario vào database, load lại để so sánh.' },
          { name: 'Scenario Comparison', description: 'So sánh 2 scenarios cạnh nhau — delta analysis.' },
          { name: 'Monte Carlo Simulation', description: 'Mô phỏng 1000 kịch bản ngẫu nhiên → probability distribution cho EBITDA.' },
        ],
        useCases: ['"Nếu giảm giá 10% nhưng tăng volume 20%, EBITDA 6 tháng tới sẽ thế nào?"', '"Save scenario A (conservative) vs B (aggressive) để trình board"'],
      },
      {
        id: 'rolling-forecast',
        title: 'b) Rolling Forecast',
        path: '/rolling-forecast',
        description: 'Dự báo cuốn tự động dựa trên dữ liệu thực.',
        dataLayer: 'L3 KPI → time-series extrapolation',
        features: [
          { name: 'Auto-generate Forecast', description: 'Dựa trên trend thực tế, tự động dự báo 3-12 tháng tới.' },
          { name: 'Forecast vs Actual', description: 'So sánh dự báo vs thực tế — đo accuracy.' },
          { name: 'Confidence Intervals', description: 'Khoảng tin cậy 80% và 95% cho mỗi dự báo.' },
        ],
        useCases: ['"Dự báo doanh thu 3 tháng tới dựa trên trend hiện tại"'],
      },
      {
        id: 'strategic-initiatives',
        title: 'c) Strategic Initiatives',
        path: '/strategic-initiatives',
        description: 'Quản lý các sáng kiến chiến lược.',
        dataLayer: 'L4 Decision → strategic_initiatives',
        features: [
          { name: 'Initiative Tracking', description: 'Mỗi initiative có: Timeline, Owner, Budget, Progress %, ROI measurement.' },
          { name: 'Priority & Resource', description: 'Phân bổ ưu tiên và resource cho từng initiative.' },
          { name: 'ROI Measurement', description: 'Đo ROI thực tế vs expected cho từng initiative.' },
        ],
        useCases: ['"Dự án mở rộng kênh TikTok Shop đang ở tiến độ nào?"'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.6 AR/AP (6 trang)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ar-ap',
    title: '6. AR/AP & Reconciliation',
    icon: Receipt,
    description: '6 trang quản lý công nợ: Invoice, AR, AP, Credit Notes, Reconciliation, Exceptions.',
    subSections: [
      {
        id: 'invoice-management',
        title: 'a) Invoice Management',
        path: '/invoice/tracking',
        description: 'Tạo và theo dõi hóa đơn bán hàng.',
        dataLayer: 'L2 Master → invoices table',
        features: [
          { name: 'Invoice Lifecycle', description: 'Draft → Sent → Partially Paid → Paid → Overdue. Tự động chuyển trạng thái.' },
          { name: 'Invoice Creation', description: 'Tạo hóa đơn từ đơn hàng hoặc thủ công. Auto-fill từ master_customers.' },
        ],
        useCases: ['"Còn bao nhiêu hóa đơn chưa thu?"'],
      },
      {
        id: 'ar-operations',
        title: 'b) AR Operations',
        path: '/ar-operations',
        description: 'Quản lý và theo dõi công nợ khách hàng.',
        dataLayer: 'L2 Master → invoices + ar_aging view',
        features: [
          { name: 'AR Aging Buckets', description: 'Current, 1-30, 31-60, 61-90, >90 ngày — biểu đồ stacked bar.', tips: ['Nợ >90 ngày = High Risk — cần provision', 'DSO tăng liên tục = Warning signal'] },
          { name: 'DSO Tracking', description: 'Days Sales Outstanding trend — mục tiêu giảm DSO.', formula: 'DSO = (Avg AR / Net Credit Sales) × Days in Period' },
          { name: 'Top Customers AR', description: 'Khách hàng nợ nhiều nhất — với risk scoring.' },
          { name: 'Collection Workflow', description: 'Quy trình thu hồi: Reminder → Follow-up → Escalation → Legal.' },
        ],
        useCases: ['"Khách hàng nào đang nợ lâu nhất?"', '"DSO tháng này so với tháng trước?"'],
      },
      {
        id: 'ap-overview',
        title: 'c) AP Overview',
        path: '/bills',
        description: 'Quản lý hóa đơn mua hàng và lịch thanh toán.',
        dataLayer: 'L2 Master → bills table',
        features: [
          { name: 'Bill Management', description: 'Tạo, theo dõi bills từ nhà cung cấp.' },
          { name: 'Payment Scheduling', description: 'Lịch thanh toán theo priority và due date.' },
        ],
        useCases: ['"Tuần này cần trả bao nhiêu tiền cho NCC?"'],
      },
      {
        id: 'credit-debit-notes',
        title: 'd) Credit/Debit Notes',
        path: '/credit-debit-notes',
        description: 'Quản lý phiếu giảm giá và điều chỉnh.',
        dataLayer: 'L2 Master → adjustment_notes',
        features: [
          { name: 'Credit Notes', description: 'Phiếu giảm trừ cho khách hàng (returns, discounts).' },
          { name: 'Debit Notes', description: 'Phiếu tăng thêm (additional charges, corrections).' },
        ],
        useCases: ['"Tổng giá trị credit notes tháng này?"'],
      },
      {
        id: 'reconciliation',
        title: 'e) Reconciliation',
        path: '/reconciliation',
        description: 'Đối soát tự động giữa ngân hàng và hóa đơn.',
        dataLayer: 'L2 Master → bank_transactions + invoices/bills',
        features: [
          { name: 'Auto-Matching', description: 'Tự động match giao dịch ngân hàng với hóa đơn dựa trên: số tiền, ngày, reference number.', tips: ['Confidence > 85% → Auto-accept ✅', 'Score 60-85% → Human review ⚠️', 'Score < 60% → Manual matching 🔴'] },
          { name: 'Confidence Score', description: 'Thuật toán matching cho điểm tin cậy dựa trên multi-criteria.' },
          { name: 'Exception Queue', description: 'Danh sách giao dịch không match tự động — cần review thủ công.' },
          { name: 'Audit Trail', description: 'Lịch sử đối soát bất biến (immutable). Không thể xóa hay sửa record đã match.' },
        ],
        useCases: ['"Những giao dịch nào chưa đối soát?"', '"Match rate tháng này là bao nhiêu %?"'],
        manifesto: ['Source tables are never mutated — all truth is derived from append-only ledger'],
      },
      {
        id: 'exceptions',
        title: 'f) Exceptions',
        path: '/exceptions',
        description: 'Giao dịch bất thường cần kiểm tra.',
        dataLayer: 'L2 Master → reconciliation exceptions',
        features: [
          { name: 'Exception List', description: 'Danh sách giao dịch bất thường: duplicate, amount mismatch, missing reference.' },
          { name: 'Resolution Workflow', description: 'Assign → Investigate → Resolve/Write-off → Audit.' },
        ],
        useCases: ['"Có giao dịch nào bất thường cần kiểm tra?"'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.7 RETAIL OPERATIONS (4 trang)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'retail-operations',
    title: '7. Retail Operations',
    icon: Store,
    description: '4 trang vận hành retail: Inventory, Allocation, Promotion ROI, Supplier Payments.',
    crossModule: ['Control Tower: Inventory risk alerts', 'MDP: Promotion performance data'],
    subSections: [
      {
        id: 'inventory-aging',
        title: 'a) Inventory Aging',
        path: '/inventory-aging',
        description: 'Phân tích tồn kho theo tuổi — phát hiện dead stock.',
        dataLayer: 'L2 Master → inventory_items + L4 Alert',
        features: [
          { name: 'Aging Buckets', description: 'Tồn kho theo tuổi: 0-30 (Fresh), 31-60 (Aging), 61-90 (Warning), >90 ngày (Dead stock).' },
          { name: 'Locked Cash Value', description: 'Giá trị tiền bị khóa trong tồn kho theo từng bucket.', formula: 'Locked Cash = Σ (Unit Cost × Quantity) per aging bucket' },
          { name: 'Decision Cards', description: 'Tự động tạo Decision Card cho tồn kho rủi ro: "Giảm giá 30% cho dead stock >90 ngày".' },
          { name: 'Import Data', description: 'Import dữ liệu tồn kho từ Excel/CSV.' },
        ],
        useCases: ['"Bao nhiêu tiền đang nằm chết trong tồn kho cũ?"', '"Dead stock >90 ngày chiếm bao nhiêu % tổng tồn kho?"'],
      },
      {
        id: 'inventory-allocation',
        title: 'b) Inventory Allocation',
        path: '/inventory-allocation',
        description: 'Điều phối tồn kho giữa các kho/cửa hàng.',
        dataLayer: 'L2 Master → inventory + stores',
        features: [
          { name: 'Rebalance Suggestions', description: 'Gợi ý chuyển hàng từ kho dư sang kho thiếu dựa trên sell-through rate.' },
          { name: 'Capacity Optimization', description: 'Tối ưu capacity mỗi kho/cửa hàng.' },
          { name: 'Simulation', description: 'Chạy thử scenario điều phối trước khi thực hiện.' },
          { name: 'Audit Log', description: 'Lịch sử các lần điều phối — ai, khi nào, từ đâu đến đâu.' },
          { name: 'Store Directory', description: 'Quản lý danh sách kho/cửa hàng.' },
        ],
        useCases: ['"Nên chuyển hàng từ kho A sang kho B để giảm dead stock?"'],
      },
      {
        id: 'promotion-roi',
        title: 'c) Promotion ROI',
        path: '/promotion-roi',
        description: 'Đo ROI thật của từng campaign/promotion.',
        dataLayer: 'L2.5 Events + L2 Master → ad_spend_daily + cdp_orders',
        features: [
          { name: 'Campaign ROI', description: 'ROI theo từng campaign sau khi trừ HẾT chi phí (COGS, logistics, returns, platform fees).', formula: 'True ROI = (Net Profit from Campaign - Campaign Cost) / Campaign Cost × 100%', tips: ['ROI ở đây là PROFIT ROI, không phải Revenue ROAS'] },
          { name: 'ROAS Analysis', description: 'Return on Ad Spend — nhưng tính trên profit, không phải revenue.', formula: 'Profit ROAS = Net Profit from Ads / Ad Spend' },
          { name: 'Channel Comparison', description: 'So sánh performance giữa các kênh quảng cáo.' },
          { name: 'Decision Cards', description: 'Tự động tạo card "STOP campaign X — đang lỗ" khi ROI < 0.' },
        ],
        useCases: ['"Chiến dịch Facebook Ads có thực sự có lãi không?"', '"Kênh quảng cáo nào mang lại profit tốt nhất?"'],
        manifesto: ['UNIT ECONOMICS → ACTION — Campaign lỗ phải nói STOP'],
      },
      {
        id: 'supplier-payments',
        title: 'd) Supplier Payments',
        path: '/supplier-payments',
        description: 'Lịch thanh toán NCC với priority optimization.',
        dataLayer: 'L2 Master → bills + suppliers',
        features: [
          { name: 'Payment Priority', description: 'Ưu tiên thanh toán theo: Critical suppliers, Early payment discount, Due date.' },
          { name: 'Early Payment Discount', description: 'Tối ưu chiết khấu thanh toán sớm — ROI calculation.', formula: 'Annualized Return = (Discount % / (1 - Discount %)) × (365 / (Full Term - Discount Term))' },
          { name: 'Overdue Tracking', description: 'Theo dõi thanh toán quá hạn — risk to supplier relationship.' },
        ],
        useCases: ['"Nên trả sớm NCC nào để được chiết khấu?"', '"Bao nhiêu bills đang quá hạn?"'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.8 SALES CHANNELS (2+ trang)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'sales-channels',
    title: '8. Sales Channels',
    icon: ShoppingCart,
    description: 'Phân tích kênh bán hàng: Channel Analytics, Unit Economics, Channel P&L.',
    crossModule: ['MDP: Channel marketing spend', 'Control Tower: Channel performance alerts'],
    subSections: [
      {
        id: 'channel-analytics',
        title: 'a) Channel Analytics',
        path: '/channel-analytics',
        description: 'Performance tổng quan theo từng kênh bán.',
        dataLayer: 'L2 Master → cdp_orders grouped by channel + L3 KPI',
        features: [
          { name: 'Channel Performance', description: 'Revenue, Orders, AOV, Margin theo từng kênh: Shopee, Lazada, TikTok Shop, Website, Offline.' },
          { name: 'Daily Revenue Trend', description: 'Xu hướng doanh thu hàng ngày — phát hiện đột biến.' },
          { name: 'Order Status Summary', description: 'Tổng hợp trạng thái đơn: Pending, Processing, Shipped, Delivered, Returned.' },
          { name: 'Fees & Settlements', description: 'Phí sàn, phí vận chuyển, phí thanh toán — và tiền settlement từ sàn.' },
        ],
        useCases: ['"Kênh Shopee đang tăng hay giảm? Phí sàn bao nhiêu?"', '"Kênh nào có margin cao nhất?"'],
      },
      {
        id: 'unit-economics',
        title: 'b) Unit Economics',
        path: '/unit-economics',
        description: 'Phân tích lợi nhuận theo từng SKU — quyết định STOP/GO.',
        dataLayer: 'L2 Master → cdp_orders + master_products + L3 KPI',
        features: [
          { name: 'SKU Profitability', description: 'Lợi nhuận thật theo từng SKU sau khi phân bổ tất cả chi phí.', formula: 'SKU Profit = Revenue - COGS - Platform Fees - Logistics - Ads Allocation - Returns' },
          { name: 'Contribution Margin by SKU', description: 'CM% theo SKU — sắp xếp từ cao đến thấp.', formula: 'CM% = (Revenue - All Variable Costs) / Revenue × 100%' },
          { name: 'SKU Stop Action', description: 'Nút STOP bán cho SKU lỗ — tự động tạo Decision Card.', tips: ['SKU có CM < 0 liên tục 30 ngày → auto-suggest STOP', 'SKU lỗ + khóa cash + tăng risk = STOP bắt buộc'] },
          { name: 'FDP Outcome Tracker', description: 'Theo dõi kết quả sau quyết định STOP/GO — đo impact thực tế.', tips: ['Default follow-up: 7 ngày sau quyết định', 'Lưu vào decision_outcome_records'] },
          { name: 'Cash Lock per SKU', description: 'Lượng tiền bị khóa trong tồn kho theo từng SKU.', formula: 'Cash Locked = Inventory Units × Unit Cost' },
        ],
        useCases: ['"SKU nào đang lỗ tiền? Nên ngừng bán SKU nào?"', '"Stop bán SKU-A123 tuần trước — kết quả tiết kiệm bao nhiêu?"'],
        manifesto: ['UNIT ECONOMICS → ACTION — SKU lỗ + khóa cash + tăng risk → phải nói STOP'],
      },
      {
        id: 'channel-pl',
        title: '+ Channel P&L',
        path: '/channel/:channelId',
        description: 'P&L chi tiết cho từng kênh bán hàng.',
        dataLayer: 'L2 Master + L3 KPI → v_channel_pl_summary',
        features: [
          { name: 'Channel Revenue', description: 'Gross Revenue → Net Revenue sau khi trừ returns, discounts.' },
          { name: 'Channel Costs', description: 'COGS, Platform Fees, Logistics, Ads — chi tiết cho kênh cụ thể.' },
          { name: 'Channel Margin', description: 'Gross Margin và Net Margin cho kênh.', formula: 'Channel Net Margin = (Channel Revenue - All Channel Costs) / Channel Revenue × 100%' },
          { name: 'Monthly Trend', description: 'Xu hướng P&L theo tháng cho kênh.' },
        ],
        useCases: ['"Kênh Lazada lãi bao nhiêu sau khi trừ hết phí?"'],
      },
      {
        id: 'channel-whatif',
        title: '+ Channel What-If',
        path: '/channel/:channelId/whatif',
        description: 'Mô phỏng thay đổi cho từng kênh cụ thể.',
        dataLayer: 'L3 KPI → channel-specific baseline',
        features: [
          { name: 'Channel Simulation', description: 'Thay đổi Price, Volume, Fees cho kênh cụ thể và xem tác động.' },
        ],
        useCases: ['"Nếu tăng giá trên Shopee 5%, lợi nhuận thay đổi thế nào?"'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.9 DATA HUB (5 trang)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'data-hub',
    title: '9. Data Hub',
    icon: Database,
    description: '5 trang quản lý dữ liệu: Connectors, Warehouse, ETL, Chart of Accounts, Bank.',
    subSections: [
      {
        id: 'data-center',
        title: 'a) Data Center',
        path: '/data-hub',
        description: 'Quản lý kết nối và đồng bộ dữ liệu.',
        dataLayer: 'L1.5 Ingestion + L10 BigQuery',
        features: [
          { name: 'Connector Integrations', description: 'Kết nối với các nguồn dữ liệu: Shopee, Lazada, TikTok, Google Sheets, BigQuery, Bank APIs.' },
          { name: 'Sync Status', description: 'Trạng thái đồng bộ real-time: Last sync, Next sync, Error count.' },
          { name: 'Data Freshness', description: 'Monitoring độ tươi dữ liệu — alert khi data stale.', tips: ['Data > 24h = Warning', 'Data > 48h = Critical — decisions may be stale'] },
        ],
        useCases: ['"Dữ liệu đã đồng bộ đến khi nào? Có lỗi gì không?"'],
      },
      {
        id: 'data-warehouse',
        title: 'b) Data Warehouse',
        path: '/data-warehouse',
        description: 'Schema explorer và data lineage.',
        dataLayer: 'L10 BigQuery → bq_connections + sync_configs',
        features: [
          { name: 'Schema Explorer', description: 'Duyệt schema và table — xem columns, data types, row counts.' },
          { name: 'Data Lineage', description: 'Truy vết nguồn gốc dữ liệu: Table A → Transform → Table B.' },
          { name: 'Sync Manager', description: 'Cấu hình và chạy sync giữa BigQuery và FDP.' },
          { name: 'Daily Sync History', description: 'Lịch sử sync hàng ngày — success rate, duration, error logs.' },
        ],
        useCases: ['"Dữ liệu doanh thu lấy từ bảng nào?"', '"Sync BigQuery bị lỗi — xem log"'],
      },
      {
        id: 'etl-rules',
        title: 'c) ETL Rules',
        path: '/etl-rules',
        description: 'Cấu hình quy tắc chuyển đổi dữ liệu.',
        dataLayer: 'L1.5 Ingestion → etl_rules',
        features: [
          { name: 'Field Mapping', description: 'Map trường dữ liệu từ nguồn sang FDP schema.' },
          { name: 'Transform Rules', description: 'Quy tắc chuyển đổi: data type, format, default values.' },
          { name: 'Validation Rules', description: 'Kiểm tra chất lượng dữ liệu khi import.' },
        ],
        useCases: ['"Map trường total từ Shopee sang gross_revenue"'],
      },
      {
        id: 'chart-of-accounts',
        title: 'd) Chart of Accounts',
        path: '/chart-of-accounts',
        description: 'Hệ thống tài khoản kế toán.',
        dataLayer: 'L1 Foundation → gl_accounts',
        features: [
          { name: 'Account Hierarchy', description: 'Cây tài khoản: Assets, Liabilities, Equity, Revenue, Expenses.' },
          { name: 'Account Mapping', description: 'Map giao dịch vào đúng tài khoản kế toán.' },
        ],
        useCases: ['"Phân loại chi phí marketing vào tài khoản nào?"'],
      },
      {
        id: 'bank-connections',
        title: 'e) Bank Connections',
        path: '/bank-connections',
        description: 'Kết nối tài khoản ngân hàng.',
        dataLayer: 'L2 Master → bank_transactions',
        features: [
          { name: 'Bank Account Setup', description: 'Kết nối tài khoản ngân hàng qua API hoặc file import.' },
          { name: 'Transaction Import', description: 'Import giao dịch ngân hàng tự động hoặc thủ công (CSV/Excel).' },
          { name: 'Balance Tracking', description: 'Theo dõi số dư tài khoản ngân hàng real-time.' },
        ],
        useCases: ['"Kết nối tài khoản Vietcombank để tự động đối soát"'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.10 TAX & COMPLIANCE (2 trang)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'tax-compliance',
    title: '10. Tax & Compliance',
    icon: Shield,
    description: '2 trang theo dõi thuế và cam kết tài chính.',
    subSections: [
      {
        id: 'tax-tracking',
        title: 'a) Tax Tracking',
        path: '/tax-compliance',
        description: 'Theo dõi nghĩa vụ thuế.',
        dataLayer: 'L3 KPI → tax calculations from invoices/bills',
        features: [
          { name: 'VAT Tracking', description: 'Thuế GTGT đầu ra - đầu vào = Thuế phải nộp.', formula: 'VAT Payable = Output VAT (Sales) - Input VAT (Purchases)' },
          { name: 'CIT Estimation', description: 'Ước tính thuế thu nhập doanh nghiệp.', formula: 'CIT = Taxable Income × Tax Rate (20%)' },
          { name: 'Tax Calendar', description: 'Lịch nộp thuế: deadline, amount, status.' },
        ],
        useCases: ['"Tháng này phải nộp VAT bao nhiêu?"'],
      },
      {
        id: 'covenant-tracking',
        title: 'b) Covenant Tracking',
        path: '/covenant-tracking',
        description: 'Theo dõi các điều kiện cam kết tài chính.',
        dataLayer: 'L3 KPI → financial ratios',
        features: [
          { name: 'Covenant Monitoring', description: 'Theo dõi các covenant từ ngân hàng/nhà đầu tư: Debt/Equity, Current Ratio, DSCR.', formula: 'Debt/Equity = Total Debt / Total Equity\nDSCR = Net Operating Income / Total Debt Service' },
          { name: 'Breach Warning', description: 'Cảnh báo sớm khi sắp vi phạm covenant — trước 30 ngày.' },
        ],
        useCases: ['"Tỷ lệ nợ/vốn có đáp ứng điều kiện ngân hàng?"'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3.11 ALERTS & ADMIN (5 trang)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'alerts-admin',
    title: '11. Alerts & Admin',
    icon: Settings,
    description: '5 trang quản trị: Alerts, Company, Members, RBAC, Audit Log.',
    subSections: [
      {
        id: 'alerts',
        title: 'a) Alerts',
        path: '/alerts',
        description: 'Tất cả cảnh báo từ L4 Alert Layer.',
        dataLayer: 'L4 Alert → alert_instances + alert_rules',
        features: [
          { name: 'Alert List', description: 'Danh sách cảnh báo: severity (Critical/High/Medium/Low), status (Open/Acknowledged/Resolved).' },
          { name: 'Alert Rules', description: 'Cấu hình quy tắc cảnh báo: KPI nào, ngưỡng nào, gửi cho ai.' },
          { name: 'Escalation Rules', description: 'Tự động escalate nếu không xử lý trong X phút.', tips: ['Critical: escalate sau 30 phút', 'High: escalate sau 2 giờ'] },
          { name: 'Alert Digest', description: 'Tóm tắt cảnh báo hàng ngày/tuần gửi qua email.' },
        ],
        useCases: ['"Có bao nhiêu alert critical đang open?"'],
      },
      {
        id: 'company-management',
        title: 'b) Company Management',
        path: '/tenant',
        description: 'Quản lý thông tin doanh nghiệp.',
        dataLayer: 'L1 Foundation → tenants',
        features: [
          { name: 'Company Profile', description: 'Tên, địa chỉ, MST, logo, thông tin liên hệ.' },
          { name: 'Organization Structure', description: 'Quản lý brands/organizations trong tenant.' },
        ],
        useCases: ['"Cập nhật thông tin công ty"'],
      },
      {
        id: 'members',
        title: 'c) Members',
        path: '/tenant/members',
        description: 'Quản lý thành viên và quyền truy cập.',
        dataLayer: 'L1 Foundation → members + member_tenant_roles',
        features: [
          { name: 'Member Management', description: 'Mời, quản lý thành viên. Mỗi user có thể thuộc nhiều tenant.' },
          { name: 'Role Assignment', description: 'Gán role cho member: Admin, CFO, Manager, Viewer.' },
        ],
        useCases: ['"Mời kế toán vào với quyền Viewer"'],
      },
      {
        id: 'rbac',
        title: 'd) RBAC',
        path: '/rbac',
        description: 'Role-Based Access Control.',
        dataLayer: 'L1 Foundation → roles + permissions',
        features: [
          { name: 'Role Definitions', description: 'Định nghĩa roles: quyền xem, sửa, xóa theo module.' },
          { name: 'Permission Matrix', description: 'Ma trận phân quyền: Role × Module × Action.' },
        ],
        useCases: ['"Kế toán chỉ được xem, không được sửa Decision Cards"'],
      },
      {
        id: 'audit-log',
        title: 'e) Audit Log',
        path: '/audit-log',
        description: 'Lịch sử thao tác hệ thống — bất biến.',
        dataLayer: 'L6 Audit → audit_logs',
        features: [
          { name: 'Activity Log', description: 'Ai làm gì, khi nào: login, data change, decision made, export.' },
          { name: 'Immutable Records', description: 'Không thể xóa hay sửa log — đảm bảo compliance.' },
          { name: 'Filter & Search', description: 'Lọc theo user, action type, date range, module.' },
        ],
        useCases: ['"Ai đã approve decision card X lúc mấy giờ?"'],
      },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

interface FDPDocumentationProps {
  searchQuery: string;
}

export function FDPDocumentation({ searchQuery }: FDPDocumentationProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('decision-center');
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  const filteredSections = useMemo(() => {
    if (!searchQuery) return fdpSections;
    const q = searchQuery.toLowerCase();
    return fdpSections.filter((section) =>
      section.title.toLowerCase().includes(q) ||
      section.description.toLowerCase().includes(q) ||
      section.subSections.some(
        (sub) =>
          sub.title.toLowerCase().includes(q) ||
          sub.description.toLowerCase().includes(q) ||
          sub.features.some(
            (f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
          ) ||
          sub.useCases?.some((u) => u.toLowerCase().includes(q))
      )
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* ── FDP Manifesto ── */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-emerald-500" />
            FDP Manifesto — 10 Nguyên tắc bất biến
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            {manifestoPrinciples.map((p) => (
              <div key={p.number} className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 shrink-0 text-xs font-mono w-6 h-5 flex items-center justify-center p-0">
                  {p.number}
                </Badge>
                <span>
                  <strong>{p.title}</strong> — {p.text}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Data Architecture ── */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-blue-500" />
            Kiến trúc Data Layers (L1 → L10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 font-medium">Layer</th>
                  <th className="text-left py-2 pr-3 font-medium">Tên</th>
                  <th className="text-left py-2 pr-3 font-medium">Bảng chính</th>
                  <th className="text-left py-2 font-medium">Mục đích</th>
                </tr>
              </thead>
              <tbody>
                {dataLayers.map((dl) => (
                  <tr key={dl.layer} className="border-b border-muted/50">
                    <td className="py-2 pr-3">
                      <Badge variant="secondary" className="text-xs font-mono">{dl.layer}</Badge>
                    </td>
                    <td className="py-2 pr-3 font-medium">{dl.name}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{dl.tables}</td>
                    <td className="py-2 text-muted-foreground">{dl.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Cross-Module Integration ── */}
      <Card className="border-purple-500/30 bg-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5 text-purple-500" />
            Cross-Module Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <span><strong>→ Control Tower:</strong> Cảnh báo từ L4 Alert dựa trên L3 KPI — "Margin giảm 15%, cần hành động"</span>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <span><strong>→ MDP:</strong> Locked costs (ads, logistics) cho Profit ROAS — marketing biết lợi nhuận thật</span>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <span><strong>→ CDP:</strong> Actual revenue per customer cho equity recalibration — giá trị khách hàng thật</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Feature Sections (11 groups) ── */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-500" />
          Tất cả tính năng theo Menu ({fdpSections.length} nhóm, {(() => { let c = 0; for (const s of fdpSections) c += s.subSections.length; return c; })()}+ trang)
        </h3>

        {filteredSections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border rounded-lg overflow-hidden bg-card"
            >
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Icon className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {section.subSections.length} trang
                  </Badge>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Section Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t"
                  >
                    <div className="p-4 space-y-3">
                      {/* Cross-module badges */}
                      {section.crossModule && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {section.crossModule.map((cm, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              <Link2 className="h-3 w-3 mr-1" />{cm}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Sub-sections */}
                      {section.subSections.map((sub) => {
                        const isSubExpanded = expandedSub === sub.id;

                        return (
                          <div key={sub.id} className="border rounded-lg overflow-hidden bg-muted/20">
                            <button
                              onClick={() => setExpandedSub(isSubExpanded ? null : sub.id)}
                              className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                            >
                              <div className="text-left">
                                <h4 className="font-medium text-sm">{sub.title}</h4>
                                <p className="text-xs text-muted-foreground">{sub.description}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className="text-xs font-mono">{sub.path}</Badge>
                                {isSubExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            </button>

                            <AnimatePresence>
                              {isSubExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="border-t"
                                >
                                  <div className="p-3 space-y-3">
                                    {/* Data Layer */}
                                    {sub.dataLayer && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <Database className="h-3 w-3 text-blue-500" />
                                        <span className="text-blue-600 dark:text-blue-400 font-mono">{sub.dataLayer}</span>
                                      </div>
                                    )}

                                    {/* Manifesto */}
                                    {sub.manifesto && (
                                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">NGUYÊN TẮC</p>
                                        {sub.manifesto.map((item, i) => (
                                          <p key={i} className="text-xs">{item}</p>
                                        ))}
                                      </div>
                                    )}

                                    {/* Features */}
                                    {sub.features.map((feature, idx) => (
                                      <div key={idx} className="space-y-1">
                                        <h5 className="font-medium text-sm flex items-center gap-2">
                                          <ArrowRight className="h-3 w-3 text-emerald-500" />
                                          {feature.name}
                                        </h5>
                                        <p className="text-xs text-muted-foreground pl-5">
                                          {feature.description}
                                        </p>
                                        {feature.formula && (
                                          <div className="ml-5 bg-muted/50 rounded-md p-2 font-mono text-xs">
                                            {feature.formula.split('\n').map((line, i) => (
                                              <div key={i}>{line}</div>
                                            ))}
                                          </div>
                                        )}
                                        {feature.tips && (
                                          <div className="ml-5 space-y-0.5">
                                            {feature.tips.map((tip, i) => (
                                              <div key={i} className="flex items-start gap-1.5 text-xs">
                                                <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                                                <span className="text-muted-foreground">{tip}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}

                                    {/* Use Cases */}
                                    {sub.useCases && sub.useCases.length > 0 && (
                                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2 space-y-1">
                                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">USE CASES</p>
                                        {sub.useCases.map((uc, i) => (
                                          <p key={i} className="text-xs text-muted-foreground">💡 {uc}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
