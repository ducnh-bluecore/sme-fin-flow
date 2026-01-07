import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calculator, 
  Search, 
  ChevronDown,
  TrendingUp,
  Wallet,
  Package,
  Clock,
  DollarSign,
  BarChart3,
  Target,
  Percent,
  ShoppingCart,
  Users,
  Building2,
  Layers,
  PiggyBank,
  Activity,
  Dices,
  AlertTriangle,
  BarChart2
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';

interface Formula {
  id: string;
  name: string;
  nameVi: string;
  formula: string;
  description: string;
  variables: { name: string; meaning: string }[];
  example?: string;
  usedIn: string[];
  category: string;
}

const formulas: Formula[] = [
  // Working Capital & CCC
  {
    id: 'dso',
    name: 'DSO (Days Sales Outstanding)',
    nameVi: 'Số ngày thu tiền bình quân',
    formula: 'DSO = (Phải thu bình quân / Doanh thu) × Số ngày',
    description: 'Đo lường số ngày trung bình để thu hồi tiền từ khách hàng sau khi bán hàng.',
    variables: [
      { name: 'Phải thu bình quân', meaning: 'Trung bình công nợ phải thu trong kỳ' },
      { name: 'Doanh thu', meaning: 'Tổng doanh thu trong kỳ' },
      { name: 'Số ngày', meaning: 'Số ngày trong kỳ (30/90/365)' },
    ],
    example: 'Phải thu = 500M, Doanh thu = 1.5B, 30 ngày → DSO = (500/1500)×30 = 10 ngày',
    usedIn: ['Working Capital', 'Cash Conversion Cycle', 'AR Operations'],
    category: 'working-capital',
  },
  {
    id: 'dio',
    name: 'DIO (Days Inventory Outstanding)',
    nameVi: 'Số ngày tồn kho bình quân',
    formula: 'DIO = (Tồn kho bình quân / COGS) × Số ngày',
    description: 'Đo lường số ngày trung bình hàng tồn kho trước khi được bán.',
    variables: [
      { name: 'Tồn kho bình quân', meaning: 'Trung bình giá trị tồn kho trong kỳ' },
      { name: 'COGS', meaning: 'Giá vốn hàng bán (Cost of Goods Sold)' },
      { name: 'Số ngày', meaning: 'Số ngày trong kỳ' },
    ],
    example: 'Tồn kho = 200M, COGS = 800M, 30 ngày → DIO = (200/800)×30 = 7.5 ngày',
    usedIn: ['Working Capital', 'Cash Conversion Cycle', 'Inventory Management'],
    category: 'working-capital',
  },
  {
    id: 'dpo',
    name: 'DPO (Days Payable Outstanding)',
    nameVi: 'Số ngày thanh toán bình quân',
    formula: 'DPO = (Phải trả bình quân / Mua hàng) × Số ngày',
    description: 'Đo lường số ngày trung bình công ty thanh toán cho nhà cung cấp.',
    variables: [
      { name: 'Phải trả bình quân', meaning: 'Trung bình công nợ phải trả trong kỳ' },
      { name: 'Mua hàng', meaning: 'Tổng giá trị mua hàng/dịch vụ trong kỳ' },
      { name: 'Số ngày', meaning: 'Số ngày trong kỳ' },
    ],
    example: 'Phải trả = 300M, Mua hàng = 600M, 30 ngày → DPO = (300/600)×30 = 15 ngày',
    usedIn: ['Working Capital', 'Cash Conversion Cycle', 'AP Operations'],
    category: 'working-capital',
  },
  {
    id: 'ccc',
    name: 'CCC (Cash Conversion Cycle)',
    nameVi: 'Chu kỳ chuyển đổi tiền mặt',
    formula: 'CCC = DSO + DIO - DPO',
    description: 'Đo lường số ngày cần để chuyển đổi vốn đầu tư (hàng tồn kho) thành tiền mặt từ bán hàng.',
    variables: [
      { name: 'DSO', meaning: 'Số ngày thu tiền bình quân' },
      { name: 'DIO', meaning: 'Số ngày tồn kho bình quân' },
      { name: 'DPO', meaning: 'Số ngày thanh toán bình quân' },
    ],
    example: 'DSO=10, DIO=7.5, DPO=15 → CCC = 10 + 7.5 - 15 = 2.5 ngày',
    usedIn: ['Working Capital', 'Cash Conversion Cycle', 'Cash Forecast'],
    category: 'working-capital',
  },
  {
    id: 'working-capital',
    name: 'Working Capital',
    nameVi: 'Vốn lưu động',
    formula: 'WC = Tài sản ngắn hạn - Nợ ngắn hạn',
    description: 'Đo lường khả năng thanh toán nợ ngắn hạn và hoạt động kinh doanh hàng ngày.',
    variables: [
      { name: 'Tài sản ngắn hạn', meaning: 'Tiền + Phải thu + Tồn kho + Tài sản khác < 1 năm' },
      { name: 'Nợ ngắn hạn', meaning: 'Phải trả + Vay ngắn hạn + Nợ khác < 1 năm' },
    ],
    usedIn: ['Working Capital', 'CFO Dashboard'],
    category: 'working-capital',
  },

  // Unit Economics
  {
    id: 'aov',
    name: 'AOV (Average Order Value)',
    nameVi: 'Giá trị đơn hàng trung bình',
    formula: 'AOV = Tổng doanh thu / Số đơn hàng',
    description: 'Giá trị trung bình của mỗi đơn hàng.',
    variables: [
      { name: 'Tổng doanh thu', meaning: 'Tổng giá trị bán hàng trong kỳ' },
      { name: 'Số đơn hàng', meaning: 'Tổng số đơn hàng hoàn thành' },
    ],
    example: 'Doanh thu = 1B, Đơn hàng = 2000 → AOV = 500K',
    usedIn: ['Unit Economics', 'Channel Analytics', 'What-If Simulation'],
    category: 'unit-economics',
  },
  {
    id: 'contribution-margin',
    name: 'Contribution Margin',
    nameVi: 'Biên lợi nhuận đóng góp',
    formula: 'CM = Doanh thu - Chi phí biến đổi',
    description: 'Phần doanh thu còn lại sau khi trừ chi phí biến đổi, dùng để trang trải chi phí cố định.',
    variables: [
      { name: 'Doanh thu', meaning: 'Tổng thu từ bán hàng' },
      { name: 'Chi phí biến đổi', meaning: 'COGS + Phí vận chuyển + Phí sàn + Phí marketing/đơn' },
    ],
    usedIn: ['Unit Economics', 'P&L Report', 'What-If Simulation'],
    category: 'unit-economics',
  },
  {
    id: 'ltv',
    name: 'LTV (Customer Lifetime Value)',
    nameVi: 'Giá trị vòng đời khách hàng',
    formula: 'LTV = AOV × Số đơn/khách × Biên LN × Thời gian giữ chân',
    description: 'Tổng giá trị mà một khách hàng mang lại trong suốt thời gian là khách hàng.',
    variables: [
      { name: 'AOV', meaning: 'Giá trị đơn hàng trung bình' },
      { name: 'Số đơn/khách', meaning: 'Số đơn trung bình mỗi khách hàng mua' },
      { name: 'Biên LN', meaning: 'Tỷ lệ lợi nhuận gộp (%)' },
      { name: 'Thời gian giữ chân', meaning: 'Số tháng/năm khách hàng quay lại' },
    ],
    usedIn: ['Unit Economics', 'What-If Simulation'],
    category: 'unit-economics',
  },
  {
    id: 'cac',
    name: 'CAC (Customer Acquisition Cost)',
    nameVi: 'Chi phí thu hút khách hàng',
    formula: 'CAC = Tổng chi marketing / Số khách hàng mới',
    description: 'Chi phí trung bình để có được một khách hàng mới.',
    variables: [
      { name: 'Tổng chi marketing', meaning: 'Chi phí quảng cáo + sales + khuyến mãi' },
      { name: 'Số khách hàng mới', meaning: 'Số khách hàng mới trong kỳ' },
    ],
    usedIn: ['Unit Economics', 'What-If Simulation', 'Retail Scenario'],
    category: 'unit-economics',
  },
  {
    id: 'ltv-cac-ratio',
    name: 'LTV:CAC Ratio',
    nameVi: 'Tỷ lệ LTV/CAC',
    formula: 'LTV:CAC = LTV / CAC',
    description: 'So sánh giá trị khách hàng với chi phí thu hút. Tỷ lệ > 3 là tốt.',
    variables: [
      { name: 'LTV', meaning: 'Giá trị vòng đời khách hàng' },
      { name: 'CAC', meaning: 'Chi phí thu hút khách hàng' },
    ],
    example: 'LTV = 1.5M, CAC = 300K → Ratio = 5:1 (Tốt)',
    usedIn: ['Unit Economics'],
    category: 'unit-economics',
  },
  {
    id: 'roas',
    name: 'ROAS (Return on Ad Spend)',
    nameVi: 'Hiệu quả chi quảng cáo',
    formula: 'ROAS = Doanh thu từ quảng cáo / Chi phí quảng cáo',
    description: 'Đo lường hiệu quả của mỗi đồng chi cho quảng cáo.',
    variables: [
      { name: 'Doanh thu từ QC', meaning: 'Doanh thu từ các nguồn quảng cáo' },
      { name: 'Chi phí QC', meaning: 'Tổng chi phí quảng cáo' },
    ],
    example: 'Doanh thu QC = 500M, Chi QC = 100M → ROAS = 5x',
    usedIn: ['Unit Economics', 'Channel Analytics'],
    category: 'unit-economics',
  },

  // P&L & Profitability
  {
    id: 'gross-profit',
    name: 'Gross Profit',
    nameVi: 'Lợi nhuận gộp',
    formula: 'Gross Profit = Doanh thu - COGS',
    description: 'Lợi nhuận sau khi trừ giá vốn hàng bán.',
    variables: [
      { name: 'Doanh thu', meaning: 'Tổng thu từ bán hàng' },
      { name: 'COGS', meaning: 'Giá vốn hàng bán (Cost of Goods Sold)' },
    ],
    usedIn: ['P&L Report', 'What-If Simulation', 'Channel P&L'],
    category: 'profitability',
  },
  {
    id: 'gross-margin',
    name: 'Gross Margin',
    nameVi: 'Biên lợi nhuận gộp',
    formula: 'Gross Margin = (Gross Profit / Doanh thu) × 100%',
    description: 'Tỷ lệ phần trăm lợi nhuận gộp trên doanh thu.',
    variables: [
      { name: 'Gross Profit', meaning: 'Lợi nhuận gộp' },
      { name: 'Doanh thu', meaning: 'Tổng doanh thu' },
    ],
    usedIn: ['P&L Report', 'What-If Simulation', 'SKU Profitability'],
    category: 'profitability',
  },
  {
    id: 'ebitda',
    name: 'EBITDA',
    nameVi: 'Lợi nhuận trước thuế, lãi vay, khấu hao',
    formula: 'EBITDA = Doanh thu - COGS - OPEX (không KH)',
    description: 'Đo lường khả năng sinh lời từ hoạt động kinh doanh cốt lõi.',
    variables: [
      { name: 'Doanh thu', meaning: 'Tổng thu từ bán hàng' },
      { name: 'COGS', meaning: 'Giá vốn hàng bán' },
      { name: 'OPEX', meaning: 'Chi phí hoạt động (không bao gồm khấu hao)' },
    ],
    usedIn: ['P&L Report', 'What-If Simulation', 'Monthly Profit Trend'],
    category: 'profitability',
  },
  {
    id: 'net-profit',
    name: 'Net Profit',
    nameVi: 'Lợi nhuận ròng',
    formula: 'Net Profit = EBITDA - Khấu hao - Lãi vay - Thuế',
    description: 'Lợi nhuận cuối cùng sau tất cả chi phí.',
    variables: [
      { name: 'EBITDA', meaning: 'Lợi nhuận trước thuế, lãi, khấu hao' },
      { name: 'Khấu hao', meaning: 'Chi phí khấu hao tài sản' },
      { name: 'Lãi vay', meaning: 'Chi phí lãi vay' },
      { name: 'Thuế', meaning: 'Thuế thu nhập doanh nghiệp' },
    ],
    usedIn: ['P&L Report', 'Financial Reports'],
    category: 'profitability',
  },

  // Retail & Channel
  {
    id: 'channel-revenue',
    name: 'Channel Revenue',
    nameVi: 'Doanh thu kênh bán',
    formula: 'Revenue = GMV - Hoàn/hủy - Chiết khấu',
    description: 'Doanh thu thực tế từ mỗi kênh bán hàng.',
    variables: [
      { name: 'GMV', meaning: 'Gross Merchandise Value - Tổng giá trị hàng hóa' },
      { name: 'Hoàn/hủy', meaning: 'Giá trị đơn hàng hoàn/hủy' },
      { name: 'Chiết khấu', meaning: 'Giảm giá, voucher, khuyến mãi' },
    ],
    usedIn: ['Channel Analytics', 'Channel P&L', 'Retail Scenario'],
    category: 'channel',
  },
  {
    id: 'channel-profit',
    name: 'Channel Profit',
    nameVi: 'Lợi nhuận kênh',
    formula: 'Profit = Revenue - COGS - Phí sàn - Phí ship - Phí QC - Overhead',
    description: 'Lợi nhuận thực tế sau khi trừ tất cả chi phí của kênh.',
    variables: [
      { name: 'Revenue', meaning: 'Doanh thu kênh' },
      { name: 'COGS', meaning: 'Giá vốn hàng bán' },
      { name: 'Phí sàn', meaning: 'Hoa hồng, phí thanh toán cho sàn TMĐT' },
      { name: 'Phí ship', meaning: 'Chi phí vận chuyển' },
      { name: 'Phí QC', meaning: 'Chi phí quảng cáo trên kênh' },
      { name: 'Overhead', meaning: 'Chi phí phân bổ (nhân sự, kho, công nghệ)' },
    ],
    usedIn: ['Channel P&L', 'Retail Scenario', 'What-If Simulation'],
    category: 'channel',
  },
  {
    id: 'conversion-rate',
    name: 'Conversion Rate',
    nameVi: 'Tỷ lệ chuyển đổi',
    formula: 'CR = (Số đơn hàng / Số lượt truy cập) × 100%',
    description: 'Tỷ lệ khách truy cập chuyển đổi thành đơn hàng.',
    variables: [
      { name: 'Số đơn hàng', meaning: 'Đơn hàng hoàn thành' },
      { name: 'Số lượt truy cập', meaning: 'Sessions/Visits trên kênh' },
    ],
    usedIn: ['Channel Analytics', 'Retail Scenario'],
    category: 'channel',
  },

  // Cash Forecast
  {
    id: 'cash-forecast',
    name: 'Cash Forecast',
    nameVi: 'Dự báo dòng tiền',
    formula: 'Tiền cuối kỳ = Tiền đầu kỳ + Dòng vào - Dòng ra',
    description: 'Dự báo số dư tiền mặt trong tương lai.',
    variables: [
      { name: 'Tiền đầu kỳ', meaning: 'Số dư tiền mặt đầu kỳ' },
      { name: 'Dòng vào', meaning: 'Thu từ AR, bán hàng, vay...' },
      { name: 'Dòng ra', meaning: 'Chi cho AP, lương, thuê, vay...' },
    ],
    usedIn: ['Cash Forecast', 'Daily Forecast', 'Weekly Forecast'],
    category: 'cash-flow',
  },
  {
    id: 'cash-runway',
    name: 'Cash Runway',
    nameVi: 'Thời gian sống tiền mặt',
    formula: 'Runway = Tiền mặt hiện có / Chi phí hàng tháng',
    description: 'Số tháng công ty có thể hoạt động với tiền mặt hiện có.',
    variables: [
      { name: 'Tiền mặt', meaning: 'Số dư tiền mặt và tương đương' },
      { name: 'Chi phí hàng tháng', meaning: 'Chi phí cố định + biến đổi hàng tháng' },
    ],
    example: 'Tiền = 2B, Chi phí = 400M/tháng → Runway = 5 tháng',
    usedIn: ['Cash Forecast', 'CFO Dashboard'],
    category: 'cash-flow',
  },
  {
    id: 'ar-collection-rate',
    name: 'AR Collection Rate',
    nameVi: 'Tỷ lệ thu hồi công nợ',
    formula: 'Rate = Tiền thu được / Công nợ đầu kỳ × 100%',
    description: 'Tỷ lệ phần trăm công nợ được thu hồi trong kỳ.',
    variables: [
      { name: 'Tiền thu được', meaning: 'Tiền thực thu từ khách hàng' },
      { name: 'Công nợ đầu kỳ', meaning: 'Số dư công nợ phải thu đầu kỳ' },
    ],
    usedIn: ['Cash Forecast', 'AR Operations'],
    category: 'cash-flow',
  },

  // What-If Simulation
  {
    id: 'projected-revenue',
    name: 'Projected Revenue',
    nameVi: 'Doanh thu dự kiến',
    formula: 'Projected = Base × (1 + Revenue%) × (1 + Price%) × (1 + Volume%)',
    description: 'Dự báo doanh thu dựa trên thay đổi các tham số.',
    variables: [
      { name: 'Base', meaning: 'Doanh thu hiện tại/gốc' },
      { name: 'Revenue%', meaning: 'Thay đổi doanh thu (%)' },
      { name: 'Price%', meaning: 'Thay đổi giá bán (%)' },
      { name: 'Volume%', meaning: 'Thay đổi số lượng bán (%)' },
    ],
    usedIn: ['What-If Simulation', 'Scenario Planning'],
    category: 'simulation',
  },
  {
    id: 'projected-profit',
    name: 'Projected Profit',
    nameVi: 'Lợi nhuận dự kiến',
    formula: 'Profit = Projected Revenue - (COGS × COGS%) - (OPEX × OPEX%)',
    description: 'Dự báo lợi nhuận dựa trên doanh thu và chi phí dự kiến.',
    variables: [
      { name: 'Projected Revenue', meaning: 'Doanh thu dự kiến' },
      { name: 'COGS', meaning: 'Giá vốn hàng bán' },
      { name: 'COGS%', meaning: 'Thay đổi COGS (%)' },
      { name: 'OPEX', meaning: 'Chi phí hoạt động' },
      { name: 'OPEX%', meaning: 'Thay đổi OPEX (%)' },
    ],
    usedIn: ['What-If Simulation', 'Scenario Planning'],
    category: 'simulation',
  },
  {
    id: 'expansion-cost',
    name: 'Expansion Cost',
    nameVi: 'Chi phí mở rộng',
    formula: 'Cost = Số cửa hàng mới × Chi phí setup/cửa hàng',
    description: 'Chi phí để mở rộng mạng lưới cửa hàng offline.',
    variables: [
      { name: 'Số cửa hàng mới', meaning: 'Số cửa hàng dự kiến mở thêm' },
      { name: 'Chi phí setup', meaning: 'Chi phí trang bị, thuê, nhân sự ban đầu' },
    ],
    usedIn: ['Retail Scenario', 'What-If Simulation'],
    category: 'simulation',
  },

  // Monte Carlo Simulation
  {
    id: 'monte-carlo',
    name: 'Monte Carlo Simulation',
    nameVi: 'Mô phỏng Monte Carlo',
    formula: 'Value_i = BaseValue × (1 + Impact × RandomFactor_i)',
    description: 'Chạy N lần mô phỏng với các yếu tố ngẫu nhiên để ước tính phân phối kết quả có thể xảy ra.',
    variables: [
      { name: 'BaseValue', meaning: 'Giá trị cơ sở (EBITDA, Cash, Revenue)' },
      { name: 'Impact', meaning: 'Mức độ tác động (-1 đến 1)' },
      { name: 'RandomFactor', meaning: 'Hệ số ngẫu nhiên từ phân phối chuẩn' },
      { name: 'N', meaning: 'Số lần mô phỏng (thường 1000-10000)' },
    ],
    example: 'Base = 1,000M, Impact = -20%, Random = 0.8 → Value = 1,000 × (1 + (-0.2) × 0.8) = 840M',
    usedIn: ['Stress Testing', 'Risk Dashboard'],
    category: 'monte-carlo',
  },
  {
    id: 'normal-distribution',
    name: 'Normal Distribution (Box-Muller)',
    nameVi: 'Phân phối chuẩn (Box-Muller)',
    formula: 'Z = √(-2 × ln(U1)) × cos(2π × U2)',
    description: 'Tạo số ngẫu nhiên theo phân phối chuẩn từ 2 số ngẫu nhiên đều.',
    variables: [
      { name: 'U1, U2', meaning: 'Số ngẫu nhiên đều trong (0,1)' },
      { name: 'Z', meaning: 'Số ngẫu nhiên chuẩn N(0,1)' },
    ],
    example: 'U1 = 0.3, U2 = 0.7 → Z = √(-2 × ln(0.3)) × cos(2π × 0.7) ≈ 0.52',
    usedIn: ['Monte Carlo Simulation'],
    category: 'monte-carlo',
  },

  // Risk Metrics
  {
    id: 'value-at-risk',
    name: 'Value at Risk (VaR)',
    nameVi: 'Giá trị rủi ro (VaR)',
    formula: 'VaR = BaseValue - Percentile(Results, α)',
    description: 'Khoản lỗ tối đa có thể xảy ra với độ tin cậy (1-α)%.',
    variables: [
      { name: 'BaseValue', meaning: 'Giá trị cơ sở' },
      { name: 'Results', meaning: 'Mảng kết quả mô phỏng' },
      { name: 'α', meaning: 'Mức ý nghĩa (thường 5% hoặc 1%)' },
    ],
    example: 'Base = 1,000M, P5 = 750M → VaR(95%) = 1,000 - 750 = 250M',
    usedIn: ['Stress Testing', 'Risk Dashboard'],
    category: 'risk-metrics',
  },
  {
    id: 'expected-shortfall',
    name: 'Expected Shortfall (CVaR)',
    nameVi: 'Kỳ vọng thiếu hụt (CVaR)',
    formula: 'ES = E[Loss | Loss > VaR] = Mean(Results < Percentile_α)',
    description: 'Kỳ vọng lỗ trong trường hợp xấu nhất vượt quá VaR.',
    variables: [
      { name: 'Results', meaning: 'Các kết quả dưới ngưỡng VaR' },
      { name: 'ES', meaning: 'Giá trị kỳ vọng thiếu hụt' },
    ],
    example: 'Các giá trị < P5: [700, 720, 680, 750] → ES = Mean = 712.5M',
    usedIn: ['Stress Testing', 'Risk Dashboard'],
    category: 'risk-metrics',
  },
  {
    id: 'expected-loss',
    name: 'Expected Loss',
    nameVi: 'Kỳ vọng tổn thất',
    formula: 'EL = |Impact| × Probability × BaseValue',
    description: 'Tổn thất kỳ vọng dựa trên xác suất và mức độ tác động.',
    variables: [
      { name: 'Impact', meaning: 'Mức độ tác động (%)' },
      { name: 'Probability', meaning: 'Xác suất xảy ra (%)' },
      { name: 'BaseValue', meaning: 'Giá trị cơ sở' },
    ],
    example: 'Impact = 20%, Prob = 30%, Base = 1,000M → EL = 0.2 × 0.3 × 1,000 = 60M',
    usedIn: ['Stress Testing', 'Risk Dashboard'],
    category: 'risk-metrics',
  },
  {
    id: 'cash-impact',
    name: 'Cash Impact',
    nameVi: 'Tác động dòng tiền',
    formula: 'CashImpact = CurrentCash × Impact%',
    description: 'Ước tính tác động trực tiếp lên dòng tiền hiện tại.',
    variables: [
      { name: 'CurrentCash', meaning: 'Tiền mặt hiện tại' },
      { name: 'Impact%', meaning: 'Phần trăm tác động' },
    ],
    example: 'Cash = 500M, Impact = -15% → CashImpact = 500 × (-0.15) = -75M',
    usedIn: ['Stress Testing', 'Cash Forecast'],
    category: 'risk-metrics',
  },

  // Statistical Measures
  {
    id: 'percentile',
    name: 'Percentile',
    nameVi: 'Phân vị',
    formula: 'P_k = Value tại vị trí (k/100) × (n-1)',
    description: 'Giá trị mà k% dữ liệu nằm dưới nó.',
    variables: [
      { name: 'k', meaning: 'Phân vị cần tìm (5, 25, 50, 75, 95)' },
      { name: 'n', meaning: 'Số lượng mẫu' },
      { name: 'Values', meaning: 'Mảng giá trị đã sắp xếp' },
    ],
    example: 'Data sorted: [100, 200, 300, 400, 500], P50 = Value tại (50/100)×4 = 2 → 300',
    usedIn: ['Monte Carlo Simulation', 'Statistics'],
    category: 'statistics',
  },
  {
    id: 'standard-deviation',
    name: 'Standard Deviation',
    nameVi: 'Độ lệch chuẩn',
    formula: 'σ = √(Σ(xi - μ)² / n)',
    description: 'Đo lường mức độ phân tán của dữ liệu quanh giá trị trung bình.',
    variables: [
      { name: 'xi', meaning: 'Các giá trị trong mẫu' },
      { name: 'μ', meaning: 'Giá trị trung bình' },
      { name: 'n', meaning: 'Số lượng mẫu' },
    ],
    example: 'Data: [100, 200, 300], μ = 200, σ = √((100-200)² + (200-200)² + (300-200)²)/3 = 81.6',
    usedIn: ['Monte Carlo Simulation', 'Variance Analysis'],
    category: 'statistics',
  },
  {
    id: 'confidence-interval',
    name: 'Confidence Interval',
    nameVi: 'Khoảng tin cậy',
    formula: 'CI = [P_α/2, P_(1-α/2)]',
    description: 'Khoảng giá trị chứa kết quả thực với độ tin cậy (1-α)%.',
    variables: [
      { name: 'P', meaning: 'Phân vị' },
      { name: 'α', meaning: 'Mức ý nghĩa' },
    ],
    example: 'CI 90% = [P5, P95] = [750M, 1,200M]',
    usedIn: ['Monte Carlo Simulation', 'Forecasting'],
    category: 'statistics',
  },

  // Scenario Analysis
  {
    id: 'scenario-impact',
    name: 'Scenario Impact',
    nameVi: 'Tác động kịch bản',
    formula: 'ScenarioValue = Σ(Factor_i × Weight_i × BaseValue)',
    description: 'Tổng hợp tác động từ nhiều yếu tố trong một kịch bản.',
    variables: [
      { name: 'Factor_i', meaning: 'Mức độ tác động của yếu tố i' },
      { name: 'Weight_i', meaning: 'Trọng số của yếu tố i' },
      { name: 'BaseValue', meaning: 'Giá trị cơ sở' },
    ],
    example: 'Revenue -10% (w=0.5), Cost +5% (w=0.3), FX -3% (w=0.2) → Total = -10×0.5 + 5×0.3 + (-3)×0.2 = -4.1%',
    usedIn: ['Stress Testing', 'What-If Simulation'],
    category: 'scenario',
  },
  {
    id: 'probability-weighted',
    name: 'Probability Weighted Value',
    nameVi: 'Giá trị theo xác suất',
    formula: 'PWV = Σ(Scenario_i × Probability_i)',
    description: 'Giá trị kỳ vọng dựa trên xác suất của các kịch bản.',
    variables: [
      { name: 'Scenario_i', meaning: 'Giá trị của kịch bản i' },
      { name: 'Probability_i', meaning: 'Xác suất của kịch bản i' },
    ],
    example: 'Best: 1,200M (20%), Base: 1,000M (50%), Worst: 700M (30%) → PWV = 1,200×0.2 + 1,000×0.5 + 700×0.3 = 950M',
    usedIn: ['Stress Testing', 'Forecasting'],
    category: 'scenario',
  },
];

const categories = [
  { id: 'all', label: 'Tất cả', icon: Calculator },
  { id: 'working-capital', label: 'Vốn lưu động', icon: Wallet },
  { id: 'unit-economics', label: 'Unit Economics', icon: Users },
  { id: 'profitability', label: 'Lợi nhuận', icon: TrendingUp },
  { id: 'channel', label: 'Kênh bán', icon: ShoppingCart },
  { id: 'cash-flow', label: 'Dòng tiền', icon: DollarSign },
  { id: 'simulation', label: 'Mô phỏng', icon: Target },
  { id: 'monte-carlo', label: 'Monte Carlo', icon: Dices },
  { id: 'risk-metrics', label: 'Rủi ro', icon: AlertTriangle },
  { id: 'statistics', label: 'Thống kê', icon: BarChart2 },
  { id: 'scenario', label: 'Kịch bản', icon: Layers },
];

export default function FormulasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredFormulas = formulas.filter(f => {
    const matchesSearch = 
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.nameVi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.formula.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedFormulas = categories.slice(1).map(cat => ({
    ...cat,
    formulas: filteredFormulas.filter(f => f.category === cat.id),
  })).filter(g => g.formulas.length > 0);

  return (
    <>
      <Helmet>
        <title>Tổng hợp Công thức | CFO Dashboard</title>
        <meta name="description" content="Danh sách tất cả công thức tính toán được sử dụng trong hệ thống CFO Dashboard" />
      </Helmet>

      <div className="space-y-6 p-6">
        <PageHeader 
          title="Tổng hợp Công thức"
          subtitle="Danh sách tất cả công thức tính toán được sử dụng trong hệ thống"
        />

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm công thức..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => setSelectedCategory(cat.id)}
              >
                <cat.icon className="h-3 w-3 mr-1" />
                {cat.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{formulas.length}</p>
                  <p className="text-xs text-muted-foreground">Tổng công thức</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{categories.length - 1}</p>
                  <p className="text-xs text-muted-foreground">Nhóm công thức</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{filteredFormulas.length}</p>
                  <p className="text-xs text-muted-foreground">Kết quả tìm</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{new Set(formulas.flatMap(f => f.usedIn)).size}</p>
                  <p className="text-xs text-muted-foreground">Trang sử dụng</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formula List */}
        {selectedCategory === 'all' ? (
          <div className="space-y-6">
            {groupedFormulas.map((group, idx) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <group.icon className="h-5 w-5" />
                      {group.label}
                      <Badge variant="secondary">{group.formulas.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {group.formulas.map(formula => (
                        <FormulaItem key={formula.id} formula={formula} />
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Accordion type="multiple" className="w-full">
                {filteredFormulas.map(formula => (
                  <FormulaItem key={formula.id} formula={formula} />
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {filteredFormulas.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Không tìm thấy công thức phù hợp</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function FormulaItem({ formula }: { formula: Formula }) {
  return (
    <AccordionItem value={formula.id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{formula.name}</span>
          </div>
          <span className="text-sm text-muted-foreground">{formula.nameVi}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-2">
          {/* Formula */}
          <div className="bg-primary/5 rounded-lg p-3 font-mono text-sm border border-primary/20">
            {formula.formula}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground">{formula.description}</p>

          {/* Variables */}
          <div>
            <p className="text-sm font-medium mb-2">Các biến số:</p>
            <div className="grid gap-1">
              {formula.variables.map((v, i) => (
                <div key={i} className="flex text-sm">
                  <span className="font-mono text-primary min-w-32">{v.name}</span>
                  <span className="text-muted-foreground">— {v.meaning}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Example */}
          {formula.example && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <span className="font-medium">Ví dụ: </span>
              <span className="text-muted-foreground">{formula.example}</span>
            </div>
          )}

          {/* Used In */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Sử dụng tại:</span>
            {formula.usedIn.map(page => (
              <Badge key={page} variant="outline" className="text-xs">
                {page}
              </Badge>
            ))}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
