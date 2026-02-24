import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  Database,
  Layers,
  BookOpen,
  Link2,
  Package,
  Truck,
  BarChart3,
  Scissors,
  TrendingUp,
  CheckCircle2,
  Settings,
  Eye,
  Target,
  Boxes,
  Factory,
  ListChecks,
  History,
  Cog,
  Shield,
  Ruler,
  Brain,
  Zap,
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

// ─── Decision Stack Philosophy ──────────────────────────────────────────────

const decisionStackPrinciples = [
  { number: 1, title: 'OPERATIONAL BRAIN', text: 'Size Control Tower — giúp operator & merchandiser bảo vệ doanh thu bằng cách phát hiện lẻ size và tái cân bằng tồn kho.' },
  { number: 2, title: 'EXECUTIVE BRAIN', text: 'Retail Flight Deck — giúp C-level quản lý "Time to Financial Damage" qua phân tích chuỗi nhân quả: Tín hiệu vận hành → Hậu quả tài chính.' },
  { number: 3, title: 'STRATEGIC BRAIN', text: 'Growth Simulator — giúp lãnh đạo lập kế hoạch mở rộng bằng cách xác định "Growth Gravity" và nhu cầu sản xuất cho doanh thu mục tiêu.' },
  { number: 4, title: 'FC-LEVEL DECISIONS', text: 'Mọi quyết định ở cấp Family Code, không phải SKU — giảm noise, tăng khả năng hành động.' },
  { number: 5, title: 'EVIDENCE-BASED', text: 'Mỗi khuyến nghị phải có Evidence Pack: data snapshot, scoring, source tables.' },
  { number: 6, title: 'REAL CASH IMPACT', text: 'Mọi chỉ số đều quy về tiền thật: Vốn Khóa, Doanh Thu Mất, Rò Biên — không có metric "cho đẹp".' },
  { number: 7, title: 'DECISION → OUTCOME', text: 'Mọi quyết định phải được theo dõi đến kết quả: Dự đoán vs Thực tế, để hệ thống học và cải thiện.' },
  { number: 8, title: 'SURFACE PROBLEMS EARLY', text: 'Phát hiện curve size vỡ, markdown risk, supply gap trước khi thành thiệt hại tài chính.' },
  { number: 9, title: 'APPROVAL GOVERNANCE', text: '3 cấp phê duyệt: SAFE → ELEVATED → HIGH. Không có quyết định lớn chạy tự do.' },
  { number: 10, title: 'FINAL TEST', text: 'Nếu Command không giúp doanh nghiệp giảm Capital Misallocation → Command đã thất bại.' },
];

// ─── Database Architecture (4 Layers) ───────────────────────────────────────

const dataLayers = [
  { layer: 'L1', name: 'Foundation', tables: 'inv_family_codes, inv_stores, inv_sku_fc_mapping, inv_state_positions, inv_state_demand, inv_collections', purpose: 'Dữ liệu gốc: Family Code, cửa hàng, ánh xạ SKU↔FC, tồn kho, demand, collection' },
  { layer: 'L2', name: 'State Tables (Daily)', tables: 'state_size_health_daily, state_size_transfer_daily, state_cash_lock_daily, state_margin_leak_daily, state_markdown_risk_daily, state_lost_revenue_daily', purpose: 'Bảng trạng thái tính toán hàng ngày — nền tảng cho KPI và quyết định' },
  { layer: 'L3', name: 'KPI & Evidence', tables: 'kpi_inventory_distortion, kpi_network_gap, kpi_size_completeness, si_evidence_packs', purpose: 'Chỉ số tổng hợp, evidence packs cho quyết định. Views: v_size_intelligence_summary, v_cash_lock_summary, v_margin_leak_summary' },
  { layer: 'L4', name: 'Decision Layer', tables: 'dec_decision_packages, dec_decision_package_lines, dec_decision_approvals, dec_decision_outcomes, dec_production_candidates', purpose: 'Đóng gói, phê duyệt, theo dõi kết quả quyết định' },
  { layer: 'SC', name: 'Semantic Config', tables: 'sem_allocation_policies, sem_sku_criticality, sem_size_curve_profiles, sem_markdown_ladders, sem_markdown_caps, inv_constraint_registry', purpose: 'Cấu hình chính sách: curves, tiers, markdown caps, allocation rules' },
];

// ─── Scoring Spec ───────────────────────────────────────────────────────────

const scoringSpecs = [
  { metric: 'Size Health Score', range: '0–100', thresholds: 'Critical <60 | Warning 60-79 | Good ≥80', formula: 'Dựa trên deviation_score, core_size_missing, shallow_depth_count. Curve state: BROKEN | WEAK | INTACT' },
  { metric: 'Markdown Risk Score', range: '0–100', thresholds: 'Thanh lý khi ≥60', formula: 'Kết hợp aging, velocity, season proximity, inventory depth' },
  { metric: 'Capital Misallocation', range: 'VNĐ', thresholds: 'Tổng = Lost Revenue + Cash Locked + Margin Leak', formula: 'Lost Revenue Est + Cash Locked Value + Margin Leak Value (from L2 state tables)' },
  { metric: 'Distortion Score', range: '0–100', thresholds: 'Đo mức độ "lệch chuẩn" của toàn bộ mạng lưới tồn kho', formula: 'Aggregated từ kpi_inventory_distortion: broken curves / total curves × weight' },
  { metric: 'Transfer Score', range: '0–100', thresholds: 'Ưu tiên cao khi ≥70', formula: '(dest_velocity × net_benefit) / transfer_cost — normalized to 0-100' },
  { metric: 'Fixability Score', range: '0–100', thresholds: 'Khả năng sửa chữa bằng transfer/reallocation', formula: 'Dựa trên available supply ở network vs demand gap' },
  { metric: 'Hero Score', range: '0–100', thresholds: 'FC xứng đáng sản xuất thêm', formula: 'Revenue velocity × sell-through rate × margin × demand trend' },
];

// ─── Engine & Edge Functions ────────────────────────────────────────────────

const engines = [
  { name: 'inventory-kpi-engine', description: 'Engine chính: tính toán Size Health, Cash Lock, Margin Leak, Lost Revenue, Transfer Suggestions hàng ngày. Ghi kết quả vào L2 State Tables.', inputs: 'inv_state_positions, inv_state_demand, inv_sku_fc_mapping', outputs: 'state_size_health_daily, state_cash_lock_daily, state_margin_leak_daily, state_lost_revenue_daily, state_size_transfer_daily, state_markdown_risk_daily' },
  { name: 'inventory-allocation-engine', description: 'Phân bổ tồn kho Push (từ DC ra store) và Lateral (giữa các store). Tôn trọng constraints và policies.', inputs: 'sem_allocation_policies, inv_state_positions, inv_constraint_registry', outputs: 'Allocation recommendations → dec_decision_packages' },
  { name: 'inventory-decision-packager', description: 'Đóng gói recommendations thành Decision Packages với approval levels. Tự động gán risk tier.', inputs: 'Transfer suggestions, allocation recs, clearance candidates', outputs: 'dec_decision_packages, dec_decision_package_lines' },
  { name: 'inventory-outcome-evaluator', description: 'Đánh giá kết quả quyết định: So sánh Dự đoán vs Thực tế. Tính accuracy score.', inputs: 'dec_decision_packages (expected), actual sales/inventory changes', outputs: 'dec_decision_outcomes (accuracy_score, variance)' },
  { name: 'growth-simulator', description: 'Mô phỏng tăng trưởng: "Muốn tăng 30% revenue cần sản xuất thêm gì?". Xác định Hero FCs và production requirements.', inputs: 'Historical sales, network gap, size curves, margin data', outputs: 'dec_production_candidates, hero FC rankings' },
];

// ─── Use Cases ──────────────────────────────────────────────────────────────

const useCases = [
  { id: 'UC1', title: 'Phát hiện & xử lý lẻ size', flow: 'Size Health Score < 60 → Smart Transfer gợi ý → Decision Package → Approval → Execution → Outcome Evaluation', impact: 'Khôi phục doanh thu mất do curve size vỡ, giải phóng vốn khóa ở store thừa', roles: 'Merchandiser → Head Merchandising → (CFO nếu HIGH)' },
  { id: 'UC2', title: 'Thanh lý hàng tồn kho', flow: 'Markdown Risk ≥ 60 → Clearance Intelligence → Channel Selection (KiotViet/Shopee/TikTok) → Markdown Ladder → Premium Guardrails → Execution', impact: 'Thu hồi vốn khóa, giảm aging inventory, bảo vệ thương hiệu (premium cap 50%)', roles: 'Merchandiser → CFO' },
  { id: 'UC3', title: 'Lập kế hoạch sản xuất', flow: 'Network Gap Analysis → Hero FC Identification → Production Candidate → Cost/Timeline estimation → Approval → Production Order', impact: 'Sản xuất đúng sản phẩm, đúng size, đúng lượng — giảm dead stock tương lai', roles: 'Planner → Head Merchandising → CFO/COO' },
  { id: 'UC4', title: 'Mô phỏng tăng trưởng', flow: 'Growth Simulator → Target Revenue Input → Hero Plan → Size Distribution → Production Requirements → Budget Approval', impact: 'Lập kế hoạch mở rộng dựa trên data thay vì cảm tính', roles: 'CEO/CFO → Planner' },
  { id: 'UC5', title: 'Đánh giá quyết định', flow: 'Decision Executed → 7-30 ngày → Outcome Evaluator → Predicted vs Actual → Accuracy Score → Learning Pattern', impact: 'Cải thiện chất lượng quyết định theo thời gian, giảm bias', roles: 'All decision makers' },
];

// ─── 9 Module Sections ──────────────────────────────────────────────────────

const commandSections: DocSection[] = [
  {
    id: 'overview',
    title: '1. Overview — Bảng Điều Khiển Vận Hành',
    icon: Eye,
    description: 'Operating Console cho CEO/CFO — nhìn ngay Capital Misallocation và rủi ro lớn nhất.',
    crossModule: ['FDP: Cash Position, Working Capital', 'Control Tower: Alert triggers'],
    subSections: [
      {
        id: 'overview-kpi',
        title: 'KPI Cards & Capital Misallocation',
        path: '/command/overview',
        description: '6 thẻ KPI trung tâm + breakdown Vốn Đặt Sai Chỗ.',
        dataLayer: 'L2 State → L3 KPI Views (v_size_intelligence_summary, v_cash_lock_summary, v_margin_leak_summary)',
        features: [
          { name: 'Giá Trị Tồn Kho', description: 'Tổng tài sản tồn kho toàn mạng lưới.', formula: 'Sum(inv_state_positions.on_hand × unit_cost)' },
          { name: 'Vốn Bị Khóa (Cash Locked)', description: 'Vốn kẹt trong curve size vỡ, hàng chậm bán, hàng chờ thanh lý.', formula: 'Sum(state_cash_lock_daily.cash_locked_value)' },
          { name: 'Doanh Thu Mất (Lost Revenue)', description: 'Ước tính doanh thu mất do thiếu size, thiếu hàng, curve không hoàn chỉnh.', formula: 'Sum(state_lost_revenue_daily.lost_revenue_est)' },
          { name: 'Rò Biên (Margin Leak)', description: 'Giá trị margin bị rò do markdown, misallocation, wrong channel.', formula: 'Sum(state_margin_leak_daily.margin_leak_value)' },
          { name: 'Distortion Score', description: 'Điểm lệch chuẩn toàn mạng (0-100). Càng cao = tồn kho càng lệch.', formula: 'kpi_inventory_distortion.distortion_score (bounded [0,100])' },
          { name: 'Capital Misallocation Breakdown', description: 'Inline breakdown: Doanh Thu Mất + Vốn Khóa + Rò Biên — hiển thị ngay trên card, không cần hover.', formula: 'Capital Misallocation = Lost Revenue + Cash Locked + Margin Leak' },
        ],
        useCases: ['CEO mở app sáng, nhìn thấy "15 tỷ vốn khóa, 3.2 tỷ doanh thu mất" → điều hướng hành động ngay', 'CFO so sánh Distortion Score tuần này vs tuần trước'],
        manifesto: ['REAL CASH IMPACT — Mọi chỉ số quy về tiền thật, không metric "cho đẹp"'],
      },
      {
        id: 'overview-intelligence',
        title: 'Intelligence Cards',
        path: '/command/overview',
        description: 'Hai thẻ tóm tắt chiến lược: Hàng Lệch Size & Thanh Lý.',
        dataLayer: 'L3 KPI → aggregated intelligence views',
        features: [
          { name: 'Size Intelligence Card', description: 'Tóm tắt: Số FC bị lẻ size, Vốn Khóa, Doanh Thu Mất. Ưu tiên hiển thị thiệt hại thay vì tổng giá trị.' },
          { name: 'Clearance Intelligence Card', description: 'Tóm tắt: Số FC cần thanh lý, tổng tồn kho (units), giá trị, Markdown Risk trung bình.' },
        ],
        useCases: ['"Bao nhiêu FC đang lẻ size? Tổng thiệt hại bao nhiêu?"', '"Có bao nhiêu FC cần thanh lý ngay?"'],
      },
    ],
  },
  {
    id: 'allocation',
    title: '2. Allocation — Phân Bổ Tồn Kho',
    icon: Truck,
    description: 'Phân bổ Push (DC → Store) và Lateral (Store ↔ Store) ở cấp Family Code.',
    crossModule: ['Size Control Tower: Smart Transfer suggestions', 'Settings: sem_allocation_policies'],
    subSections: [
      {
        id: 'allocation-push',
        title: 'Push Allocation',
        path: '/command/allocation',
        description: 'Phân bổ từ trung tâm phân phối (DC) ra các cửa hàng theo demand và size curve.',
        dataLayer: 'L1 Foundation + L2 State → inventory-allocation-engine → dec_decision_packages',
        features: [
          { name: 'Demand-based Allocation', description: 'Phân bổ dựa trên inv_state_demand + sem_size_curve_profiles — đảm bảo mỗi store nhận đúng size, đúng lượng.' },
          { name: 'Constraint Respect', description: 'Tôn trọng inv_constraint_registry: min/max qty, store capacity, transportation limits.', tips: ['Constraint violations → block allocation, không chạy tự do'] },
          { name: 'Policy Driven', description: 'sem_allocation_policies quyết định: priority rules, fair-share vs demand-weighted, seasonal adjustments.' },
        ],
        useCases: ['Hàng mới về DC → phân bổ ra 20 store theo demand forecast và size curve', 'Season transition → reallocate theo policy mới'],
      },
      {
        id: 'allocation-lateral',
        title: 'Lateral Transfer',
        path: '/command/allocation',
        description: 'Chuyển hàng ngang giữa các store khi phát hiện mất cân bằng.',
        dataLayer: 'L2 state_size_transfer_daily → dec_decision_packages',
        features: [
          { name: 'Smart Transfer Suggestions', description: 'Từ Size Intelligence Engine: source store thừa + dest store thiếu → gợi ý transfer kèm net_benefit.', formula: 'Net Benefit = estimated_revenue_gain - estimated_transfer_cost\nTransfer Score = (dest_velocity × net_benefit) / cost' },
          { name: 'Transfer Batching', description: 'Nhóm nhiều transfer cùng route để tối ưu logistics cost.' },
        ],
        useCases: ['Store A thừa size 39, Store B thiếu size 39 nhưng bán tốt → lateral transfer'],
      },
    ],
  },
  {
    id: 'assortment',
    title: '3. Assortment — Size Control Tower (Operational Brain)',
    icon: Boxes,
    description: 'Phát hiện lẻ size, Smart Transfer, Evidence Pack — bảo vệ doanh thu ở cấp vận hành.',
    crossModule: ['Allocation: Transfer execution', 'Decision Queue: Package approval'],
    subSections: [
      {
        id: 'assortment-detection',
        title: 'Size Break Detection',
        path: '/command/assortment',
        description: 'Phát hiện curve size vỡ (BROKEN/WEAK) trên toàn mạng lưới.',
        dataLayer: 'L2 state_size_health_daily → kpi_size_completeness',
        features: [
          { name: 'Size Health Score', description: 'Điểm sức khỏe size 0-100 cho mỗi FC × Store.', formula: 'Score dựa trên:\n- deviation_score (lệch so với ideal curve)\n- core_size_missing (thiếu size chính)\n- shallow_depth_count (size có depth < threshold)', tips: ['Critical (<60): Curve vỡ nặng, cần hành động ngay', 'Warning (60-79): Đang yếu, cần theo dõi', 'Good (≥80): Curve nguyên vẹn'] },
          { name: 'Curve State Classification', description: 'BROKEN: curve vỡ nghiêm trọng | WEAK: yếu nhưng chưa vỡ | INTACT: bình thường.' },
          { name: 'Core Size Missing Alert', description: 'Cảnh báo khi size bán chạy nhất (core sizes) hết hàng — impact doanh thu cao nhất.' },
        ],
        useCases: ['"FC giày thể thao đang BROKEN ở 8/20 store — thiếu size 39, 40 (core sizes)"'],
        manifesto: ['SURFACE PROBLEMS EARLY — Phát hiện curve vỡ trước khi mất doanh thu'],
      },
      {
        id: 'assortment-transfer',
        title: 'Smart Transfer & Evidence Pack',
        path: '/command/assortment',
        description: 'Gợi ý transfer thông minh kèm evidence để ra quyết định.',
        dataLayer: 'L2 state_size_transfer_daily → L3 si_evidence_packs',
        features: [
          { name: 'Transfer Recommendations', description: 'Source → Dest suggestions với: qty, net_benefit, transfer_score, reason.', formula: 'Net Benefit = revenue_gain - transfer_cost\nChỉ gợi ý khi Net Benefit > 0 VÀ Transfer Score ≥ threshold' },
          { name: 'Evidence Pack', description: 'Bộ bằng chứng cho mỗi recommendation: data snapshot, scoring breakdown, source tables. Giúp approver hiểu TẠI SAO.', tips: ['Evidence type: SIZE_BREAK, CASH_LOCK, MARGIN_LEAK, MARKDOWN_RISK', 'Severity: CRITICAL, HIGH, MEDIUM, LOW'] },
          { name: 'Fixability Score', description: 'Khả năng sửa chữa bằng transfer/reallocation. Score cao = có hàng trong network để fix.', formula: 'Available supply ở các store khác / Total demand gap' },
        ],
        useCases: ['Merchandiser xem evidence pack → confirm transfer 50 đôi size 39 từ Store A → Store B → ước tính recover 15M doanh thu'],
      },
    ],
  },
  {
    id: 'clearance',
    title: '4. Clearance Intelligence (Executive Brain)',
    icon: Scissors,
    description: 'Thanh lý hàng tồn: Markdown Memory, Channel Optimization, Premium Guardrails.',
    crossModule: ['FDP: Cash locked recovery', 'Settings: sem_markdown_ladders, sem_markdown_caps'],
    subSections: [
      {
        id: 'clearance-detection',
        title: 'Markdown Risk & Candidate Detection',
        path: '/command/clearance',
        description: 'Phát hiện FC cần thanh lý dựa trên markdown_risk_score.',
        dataLayer: 'L2 state_markdown_risk_daily → fn_clearance_candidates RPC',
        features: [
          { name: 'Markdown Risk Score', description: 'Điểm rủi ro markdown 0-100. Dựa trên aging, velocity, season proximity, inventory depth.', formula: 'Score ≥ 60 → candidate thanh lý\nScore ≥ 80 → urgent, cần hành động ngay', tips: ['Kết hợp với curve state: FC vừa BROKEN vừa high markdown risk = ưu tiên cao nhất'] },
          { name: 'Collection-based Grouping', description: 'Nhóm FC theo collection để thanh lý theo chiến dịch, không rời rạc.' },
        ],
      },
      {
        id: 'clearance-execution',
        title: 'Channel Selection & Markdown Memory',
        path: '/command/clearance',
        description: 'Chọn kênh bán và mức discount tối ưu dựa trên lịch sử.',
        dataLayer: 'inv_markdown_events → sem_markdown_ladders → v_clearance_history_by_fc',
        features: [
          { name: 'Channel Analytics', description: 'So sánh hiệu quả thanh lý giữa các kênh: KiotViet (offline), Shopee, TikTok. Mỗi kênh có clearability khác nhau.' },
          { name: 'Markdown Ladder', description: 'Bậc thang discount dựa trên lịch sử: mỗi FC × Channel có optimal discount step.', formula: 'sem_markdown_ladders: discount_step → clearability_score → avg_days_to_clear\n5 bands: 0-10%, 11-20%, 21-30%, 31-50%, 50%+' },
          { name: 'Sales Velocity', description: '"Days to Clear" — ước tính số ngày để bán hết ở mỗi mức discount.' },
          { name: 'Premium Guardrails', description: 'Bảo vệ thương hiệu: sem_markdown_caps giới hạn max discount. Signature/Premium items: cap 50%.', tips: ['Override chỉ bởi CFO/COO', 'Violation → block decision, không cho markdown quá cap'] },
        ],
        useCases: ['FC giày premium aging 120 ngày → Markdown Ladder gợi ý 30% discount trên Shopee → est. clear trong 21 ngày', '"FC này đã từng markdown 40% trên TikTok và clear trong 14 ngày — lặp lại?"'],
      },
    ],
  },
  {
    id: 'network-gap',
    title: '5. Network Gap — Phân Tích Thiếu Hụt (Strategic Brain)',
    icon: TrendingUp,
    description: 'Phát hiện supply gap, Transfer Coverage, Growth Simulator.',
    crossModule: ['Production Candidates: Hero FC → Production', 'Allocation: Gap → Reallocation'],
    subSections: [
      {
        id: 'network-gap-analysis',
        title: 'Supply Gap Analysis',
        path: '/command/network-gap',
        description: 'Phân tích chênh lệch giữa demand và supply trên toàn mạng lưới.',
        dataLayer: 'L3 kpi_network_gap → aggregated gap views',
        features: [
          { name: 'Gap by FC × Store', description: 'Ma trận FC × Store hiển thị: demand, supply, gap, gap severity.' },
          { name: 'Transfer Coverage', description: 'Bao nhiêu % gap có thể fix bằng lateral transfer (hàng có sẵn ở store khác).', formula: 'Transfer Coverage % = Fixable Gap / Total Gap × 100' },
          { name: 'Production Need', description: 'Gap không fix được bằng transfer → cần sản xuất thêm.' },
        ],
        useCases: ['"FC áo thun basic thiếu 2000 units across 15 store — 60% fixable by transfer, 40% cần sản xuất"'],
      },
      {
        id: 'growth-simulator',
        title: 'Growth Simulator',
        path: '/command/network-gap',
        description: 'Mô phỏng: "Muốn tăng X% revenue → cần gì?"',
        dataLayer: 'growth-simulator engine → dec_production_candidates',
        features: [
          { name: 'Target Revenue Input', description: 'Nhập mục tiêu tăng trưởng (% hoặc absolute) → simulator tính ngược.' },
          { name: 'Hero FC Identification', description: 'Xác định FC nào đóng góp nhiều nhất cho target. Hero Score ranking.', formula: 'Hero Score = Revenue Velocity × Sell-through × Margin × Demand Trend' },
          { name: 'Size Distribution Plan', description: 'Dựa trên sem_size_curve_profiles → phân bổ production theo size curve tối ưu.' },
          { name: 'Production Requirements', description: 'Output: danh sách FC × Size × Qty cần sản xuất, estimated cost, estimated revenue.' },
        ],
        useCases: ['"Muốn tăng 30% revenue quý tới → cần sản xuất thêm 5 Hero FCs, tổng 15,000 units, investment 2.5 tỷ"'],
        manifesto: ['STRATEGIC BRAIN — Lập kế hoạch mở rộng dựa trên data, không cảm tính'],
      },
    ],
  },
  {
    id: 'production',
    title: '6. Production Candidates',
    icon: Factory,
    description: 'Đề xuất sản xuất từ Network Gap & Growth Simulator.',
    subSections: [
      {
        id: 'production-management',
        title: 'Production Candidate Management',
        path: '/command/production',
        description: 'Quản lý danh sách FC đề xuất sản xuất.',
        dataLayer: 'L4 dec_production_candidates',
        features: [
          { name: 'Candidate List', description: 'Danh sách FC × Size đề xuất sản xuất: qty, unit cost, total investment, expected revenue, expected margin.' },
          { name: 'Priority Ranking', description: 'Xếp hạng theo Hero Score + Network Gap severity + Expected ROI.' },
          { name: 'Approval Workflow', description: 'Production candidate → Decision Package → 3-tier approval.' },
        ],
        useCases: ['"5 Hero FCs cần sản xuất — xếp hạng theo ROI expected, gửi CFO duyệt"'],
      },
    ],
  },
  {
    id: 'decisions',
    title: '7. Decision Queue — Hàng Đợi Phê Duyệt',
    icon: ListChecks,
    description: 'Trung tâm phê duyệt quyết định với 3 cấp governance.',
    subSections: [
      {
        id: 'decision-queue',
        title: 'Decision Package Queue',
        path: '/command/decisions',
        description: 'Hàng đợi tất cả decision packages đang chờ phê duyệt.',
        dataLayer: 'L4 dec_decision_packages + dec_decision_approvals',
        features: [
          { name: 'Package Overview', description: 'Mỗi package: type (TRANSFER/CLEARANCE/PRODUCTION), FC count, total value, risk tier, deadline.' },
          { name: '3-Tier Approval', description: 'SAFE: Planner tự approve (impact < threshold). ELEVATED: Head Merchandising (medium impact). HIGH: CFO/COO (high impact).', tips: ['Risk tier tự động gán dựa trên total value + FC count + type', 'Escalation tự động nếu quá deadline'] },
          { name: 'Evidence Attached', description: 'Mỗi decision package link đến Evidence Packs — approver xem data trước khi quyết.' },
          { name: 'Batch Approval', description: 'Approve nhiều SAFE packages cùng lúc để tiết kiệm thời gian.' },
        ],
        useCases: ['Head Merchandising mở Decision Queue → thấy 3 ELEVATED packages → review evidence → approve 2, reject 1 với lý do'],
        manifesto: ['APPROVAL GOVERNANCE — Không có quyết định lớn chạy tự do'],
      },
    ],
  },
  {
    id: 'outcomes',
    title: '8. Decision Outcomes — Replay & Đánh Giá',
    icon: History,
    description: 'So sánh Dự đoán vs Thực tế, tính accuracy, rút kinh nghiệm.',
    subSections: [
      {
        id: 'outcome-evaluation',
        title: 'Outcome Evaluation',
        path: '/command/outcomes',
        description: 'Đánh giá kết quả quyết định sau execution.',
        dataLayer: 'L4 dec_decision_outcomes → inventory-outcome-evaluator engine',
        features: [
          { name: 'Predicted vs Actual', description: 'So sánh: Expected Revenue Gain vs Actual Revenue, Expected Cost vs Actual Cost.', formula: 'Accuracy Score = 1 - |Predicted - Actual| / Predicted\nVariance = Actual - Predicted' },
          { name: 'Decision Timeline', description: 'Replay timeline: Created → Approved → Executed → Measured. Mỗi step có timestamp + owner.' },
          { name: 'Learning Patterns', description: 'Hệ thống học từ outcomes: loại quyết định nào thường accurate, loại nào hay sai.', tips: ['Outcome evaluation mặc định sau 7-30 ngày', 'Feed back vào AI Decision Advisor'] },
        ],
        useCases: ['"Transfer 50 đôi size 39 dự đoán recover 15M → thực tế recover 12M → accuracy 80%"', '"Clearance decisions thường over-estimate revenue by 15% → adjust future predictions"'],
        manifesto: ['DECISION → OUTCOME — Mọi quyết định phải được theo dõi đến kết quả'],
      },
    ],
  },
  {
    id: 'settings',
    title: '9. Settings — Cấu Hình Chính Sách',
    icon: Cog,
    description: 'Semantic configurations: Allocation Policies, Size Curves, Markdown Caps, Criticality Tiers.',
    subSections: [
      {
        id: 'settings-policies',
        title: 'Allocation Policies & Constraints',
        path: '/command/settings',
        description: 'Quy tắc phân bổ và ràng buộc.',
        dataLayer: 'SC sem_allocation_policies + inv_constraint_registry',
        features: [
          { name: 'Allocation Policies', description: 'Quy tắc: fair-share vs demand-weighted, priority stores, seasonal adjustments.', tips: ['Policy changes require ELEVATED approval'] },
          { name: 'Constraint Registry', description: 'Ràng buộc vật lý: min/max qty per store, capacity limits, shipping restrictions.' },
        ],
      },
      {
        id: 'settings-curves',
        title: 'Size Curve Profiles',
        path: '/command/settings',
        description: 'Định nghĩa curve size lý tưởng cho từng category.',
        dataLayer: 'SC sem_size_curve_profiles',
        features: [
          { name: 'Curve Templates', description: 'Curve lý tưởng theo category: Giày (36-44), Áo (S-XXL). Core sizes, depth targets.' },
          { name: 'Store-specific Curves', description: 'Override curve theo store (CBD store vs suburban store có demand khác nhau).' },
        ],
      },
      {
        id: 'settings-markdown',
        title: 'Markdown Caps & Criticality',
        path: '/command/settings',
        description: 'Giới hạn markdown và phân loại SKU criticality.',
        dataLayer: 'SC sem_markdown_caps + sem_sku_criticality',
        features: [
          { name: 'Markdown Caps', description: 'Max discount % theo FC/category. Premium: 50%, Standard: 70%, Outlet: không giới hạn.', tips: ['Override phải bởi CFO/COO role', 'Cap bảo vệ brand equity'] },
          { name: 'SKU Criticality Tiers', description: 'HERO: top revenue contributors, protect at all costs. CORE: standard items. TAIL: low performers, clearance candidates.' },
        ],
        useCases: ['"Set Premium category max discount 50% → hệ thống block mọi clearance proposal quá 50%"'],
      },
    ],
  },
];

// ─── Approval Flow ──────────────────────────────────────────────────────────

const approvalLevels = [
  { level: 'SAFE', approver: 'Planner / Merchandiser', criteria: 'Impact thấp, < threshold VNĐ, routine transfers', autoApprove: 'Có thể batch approve' },
  { level: 'ELEVATED', approver: 'Head Merchandising', criteria: 'Medium impact, nhiều FC, cross-region transfers', autoApprove: 'Không, review từng package' },
  { level: 'HIGH', approver: 'CFO / COO', criteria: 'High impact, production decisions, policy overrides, premium guardrail exceptions', autoApprove: 'Không, cần evidence pack đầy đủ' },
];

// ─── Component ──────────────────────────────────────────────────────────────

interface CommandDocumentationProps {
  searchQuery: string;
}

export function CommandDocumentation({ searchQuery }: CommandDocumentationProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  const filteredSections = useMemo(() => {
    if (!searchQuery) return commandSections;
    const q = searchQuery.toLowerCase();
    return commandSections.filter((section) =>
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
      {/* ── Decision Stack Manifesto ── */}
      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-orange-500" />
            Command Manifesto — Decision Stack Philosophy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            {decisionStackPrinciples.map((p) => (
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

      {/* ── Data Architecture (4 Layers) ── */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-blue-500" />
            Kiến trúc Database (L1 → L4 + Semantic Config)
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

      {/* ── Scoring Spec ── */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-amber-500" />
            KPI & Scoring Specification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 font-medium">Metric</th>
                  <th className="text-left py-2 pr-3 font-medium">Range</th>
                  <th className="text-left py-2 pr-3 font-medium">Thresholds</th>
                  <th className="text-left py-2 font-medium">Formula / Logic</th>
                </tr>
              </thead>
              <tbody>
                {scoringSpecs.map((s) => (
                  <tr key={s.metric} className="border-b border-muted/50">
                    <td className="py-2 pr-3 font-medium">{s.metric}</td>
                    <td className="py-2 pr-3"><Badge variant="outline" className="text-xs font-mono">{s.range}</Badge></td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{s.thresholds}</td>
                    <td className="py-2 text-xs font-mono text-muted-foreground">{s.formula}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Engine & Edge Functions ── */}
      <Card className="border-violet-500/30 bg-violet-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-violet-500" />
            Engine & Edge Functions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {engines.map((eng) => (
            <div key={eng.name} className="border rounded-lg p-3 bg-card">
              <h4 className="font-mono font-semibold text-sm mb-1">{eng.name}</h4>
              <p className="text-xs text-muted-foreground mb-2">{eng.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium text-blue-500">Input: </span>
                  <span className="font-mono text-muted-foreground">{eng.inputs}</span>
                </div>
                <div>
                  <span className="font-medium text-emerald-500">Output: </span>
                  <span className="font-mono text-muted-foreground">{eng.outputs}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Use Cases ── */}
      <Card className="border-teal-500/30 bg-teal-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-teal-500" />
            Use Cases (5 quy trình chính)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {useCases.map((uc) => (
            <div key={uc.id} className="border rounded-lg p-3 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs font-mono">{uc.id}</Badge>
                <h4 className="font-semibold text-sm">{uc.title}</h4>
              </div>
              <div className="space-y-1.5 text-xs">
                <div><span className="font-medium">Flow: </span><span className="text-muted-foreground">{uc.flow}</span></div>
                <div><span className="font-medium">Impact: </span><span className="text-muted-foreground">{uc.impact}</span></div>
                <div><span className="font-medium">Roles: </span><span className="text-muted-foreground">{uc.roles}</span></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Approval Flow ── */}
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-rose-500" />
            Quy trình phê duyệt 3 cấp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 font-medium">Cấp</th>
                  <th className="text-left py-2 pr-3 font-medium">Approver</th>
                  <th className="text-left py-2 pr-3 font-medium">Tiêu chí</th>
                  <th className="text-left py-2 font-medium">Auto-approve?</th>
                </tr>
              </thead>
              <tbody>
                {approvalLevels.map((al) => (
                  <tr key={al.level} className="border-b border-muted/50">
                    <td className="py-2 pr-3"><Badge variant="outline" className="text-xs font-mono">{al.level}</Badge></td>
                    <td className="py-2 pr-3 font-medium">{al.approver}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{al.criteria}</td>
                    <td className="py-2 text-xs text-muted-foreground">{al.autoApprove}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Data Flow Diagram ── */}
      <Card className="border-indigo-500/30 bg-indigo-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRight className="h-5 w-5 text-indigo-500" />
            Luồng dữ liệu tổng thể
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-xs bg-muted/50 rounded-lg p-4 overflow-x-auto whitespace-pre">
{`┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW: Command Module                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  L1 INGESTION          L2 STATE TABLES         L3 KPI & EVIDENCE       │
│  ┌──────────┐          ┌──────────────┐        ┌──────────────┐        │
│  │ Positions │──────▶  │ Size Health   │──────▶ │ Distortion   │        │
│  │ Demand    │──────▶  │ Cash Lock     │──────▶ │ Network Gap  │        │
│  │ FC/SKU    │──────▶  │ Margin Leak   │──────▶ │ Evidence     │        │
│  │ Stores    │──────▶  │ Lost Revenue  │──────▶ │ Packs        │        │
│  └──────────┘          │ Markdown Risk │        └──────┬───────┘        │
│                        │ Transfers     │               │                │
│                        └──────────────┘               ▼                │
│                                                                         │
│  L4 DECISION LAYER                    SEMANTIC CONFIG                   │
│  ┌──────────────────┐                 ┌──────────────┐                 │
│  │ Decision Packages │◀───────────── │ Policies     │                 │
│  │ Package Lines     │                │ Curves       │                 │
│  │ Approvals         │                │ Caps         │                 │
│  │ Outcomes          │                │ Criticality  │                 │
│  │ Production Cands  │                └──────────────┘                 │
│  └────────┬─────────┘                                                  │
│           │                                                             │
│           ▼                                                             │
│  ┌──────────────────┐                                                  │
│  │ OUTCOME EVALUATOR │ ── Predicted vs Actual → Accuracy Score         │
│  └──────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────────┘`}
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
            <span><strong>→ FDP:</strong> Cash Locked, Lost Revenue feed vào Cash Position & Working Capital Hub. Capital Misallocation ảnh hưởng trực tiếp Net Profit.</span>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <span><strong>→ Control Tower:</strong> Size Health Critical + Cash Lock alerts tự động trigger Decision Cards.</span>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <span><strong>→ MDP:</strong> Markdown events feed vào channel cost analysis. Clearance discount ảnh hưởng Profit ROAS.</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Feature Sections (9 modules) ── */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-orange-500" />
          Tất cả tính năng theo Module ({commandSections.length} module)
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
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Icon className="h-5 w-5 text-orange-500" />
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
                                          <ArrowRight className="h-3 w-3 text-orange-500" />
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
                                      <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-2 space-y-1">
                                        <p className="text-xs font-medium text-orange-600 dark:text-orange-400">USE CASES</p>
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
