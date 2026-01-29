/**
 * FDP Sales Deck PDF Generator
 * 
 * Generates a professional PDF sales deck for the Financial Data Platform
 * using @react-pdf/renderer
 * 
 * Vietnamese content with proper diacritics
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Get base URL dynamically for font loading
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// Register Noto Sans font (supports Vietnamese characters) with absolute URLs
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
    { src: `${getBaseUrl()}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
  ],
});

// Brand colors
const colors = {
  primary: '#3b82f6',      // Blue
  primaryDark: '#1e40af',  // Dark blue
  accent: '#10b981',       // Green
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  text: '#1f2937',         // Gray 800
  textLight: '#6b7280',    // Gray 500
  background: '#f8fafc',   // Slate 50
  backgroundAlt: '#e0f2fe', // Sky 100
  white: '#ffffff',
  black: '#000000',
  gradientStart: '#f0f9ff', // Sky 50
  gradientEnd: '#e0f2fe',   // Sky 100
};

// Styles - Using Noto Sans font (supports Vietnamese)
const styles = StyleSheet.create({
  // Base page styles
  page: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.white,
  },
  pageAlt: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.background,
  },
  pageGradient: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.gradientStart,
  },
  
  // Cover page
  coverPage: {
    padding: 60,
    fontFamily: 'NotoSans',
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverTitle: {
    fontSize: 48,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 18,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 1.6,
  },
  coverBadge: {
    marginTop: 40,
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  coverBadgeText: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.white,
    letterSpacing: 1,
  },
  coverTagline: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: 700,
    color: colors.accent,
    opacity: 0.9,
  },

  // Cover ornaments
  coverOrnament: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.15,
    backgroundColor: colors.white,
  },
  coverCircle1: {
    width: 500,
    height: 500,
    top: -180,
    right: -200,
  },
  coverCircle2: {
    width: 600,
    height: 600,
    bottom: -280,
    left: -300,
    opacity: 0.1,
  },
  coverCircle3: {
    width: 200,
    height: 200,
    bottom: 120,
    right: 80,
    opacity: 0.08,
  },
  
  // Slide header components
  eyebrowLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 12,
  },
  sectionTitleCenter: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: 400,
    color: colors.textLight,
    marginBottom: 28,
    maxWidth: 480,
    lineHeight: 1.5,
  },
  sectionSubtitleCenter: {
    fontSize: 13,
    fontWeight: 400,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 420,
    alignSelf: 'center',
    lineHeight: 1.5,
  },
  
  // Why Bluecore page styles
  whyContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  whyRow: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  whyPainColumn: {
    flex: 1,
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRightWidth: 2,
    borderRightColor: '#fecaca',
  },
  whySolutionColumn: {
    flex: 1,
    backgroundColor: '#ecfdf5',
    padding: 14,
  },
  whyLabelPain: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.danger,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  whyLabelSolution: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.accent,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  whyPainTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 4,
  },
  whyPainDesc: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  whySolutionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 4,
  },
  whySolutionDesc: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  costBox: {
    marginTop: 16,
    backgroundColor: colors.primaryDark,
    padding: 16,
    borderRadius: 10,
  },
  costBoxTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 6,
  },
  costBoxText: {
    fontSize: 10,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.9,
    lineHeight: 1.5,
  },
  
  // Comparison table styles
  compTable: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  compHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.primaryDark,
  },
  compRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  compRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: colors.background,
  },
  compCell: {
    flex: 1,
    padding: 10,
    fontSize: 9,
    fontWeight: 400,
    color: colors.text,
    textAlign: 'center',
  },
  compCellFirst: {
    flex: 1.3,
    padding: 10,
    fontSize: 9,
    fontWeight: 700,
    color: colors.text,
    textAlign: 'left',
    backgroundColor: '#f1f5f9',
  },
  compHeaderCell: {
    flex: 1,
    padding: 10,
    fontSize: 10,
    fontWeight: 700,
    color: colors.white,
    textAlign: 'center',
  },
  compHeaderCellFirst: {
    flex: 1.3,
    padding: 10,
    fontSize: 10,
    fontWeight: 700,
    color: colors.white,
    textAlign: 'left',
  },
  compCellHighlight: {
    flex: 1,
    padding: 10,
    fontSize: 9,
    fontWeight: 700,
    color: colors.accent,
    textAlign: 'center',
    backgroundColor: '#ecfdf5',
  },
  compHighlightBox: {
    marginTop: 24,
    backgroundColor: colors.primaryDark,
    padding: 20,
    borderRadius: 10,
  },
  compHighlightTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 8,
  },
  compHighlightText: {
    fontSize: 10,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.9,
    lineHeight: 1.6,
  },
  
  // Manifesto styles
  manifestoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  manifestoItem: {
    width: '48%',
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  manifestoNumber: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
  },
  manifestoTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 4,
  },
  manifestoDesc: {
    fontSize: 8,
    fontWeight: 400,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  
  // Capability styles
  capabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  capabilityCard: {
    width: '48%',
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  capabilityCardAlt: {
    width: '48%',
    backgroundColor: colors.backgroundAlt,
    padding: 18,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  capabilityIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  capabilityIconText: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.white,
  },
  capabilityTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 6,
  },
  capabilityDesc: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.textLight,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  capabilityFeatures: {
    marginTop: 8,
  },
  capabilityFeature: {
    fontSize: 8,
    fontWeight: 400,
    color: colors.text,
    marginBottom: 4,
    paddingLeft: 8,
  },
  
  // Feature list styles
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 14,
  },
  featureColumn: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featureColumnAlt: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    padding: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  featureColumnTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 8,
  },
  featureItem: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.text,
    marginBottom: 6,
    paddingLeft: 8,
  },
  
  // Decision flow styles
  decisionFlow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  decisionStep: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  decisionStepCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  decisionStepNumber: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.white,
  },
  decisionStepTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
    textAlign: 'center',
  },
  decisionStepDesc: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  decisionArrow: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.primary,
    marginHorizontal: 6,
  },
  
  // Use case box
  useCaseBox: {
    backgroundColor: colors.primaryDark,
    padding: 22,
    borderRadius: 12,
    marginTop: 10,
  },
  useCaseTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 8,
  },
  useCaseValue: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.accent,
    marginBottom: 8,
  },
  useCaseDesc: {
    fontSize: 10,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.9,
    lineHeight: 1.5,
  },
  useCaseMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  useCaseMetric: {
    alignItems: 'center',
  },
  useCaseMetricValue: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.white,
  },
  useCaseMetricLabel: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  
  // Contact page
  contactTitle: {
    fontSize: 42,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  contactSubtitle: {
    fontSize: 16,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 1.6,
  },
  contactInfo: {
    marginTop: 40,
    alignItems: 'center',
  },
  contactItem: {
    fontSize: 14,
    fontWeight: 400,
    color: colors.white,
    marginBottom: 10,
  },
  contactCTA: {
    marginTop: 30,
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
  },
  contactCTAText: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.white,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.textLight,
  },
  pageNumber: {
    fontSize: 10,
    fontWeight: 400,
    color: colors.textLight,
  },
  
  // Accent bar for some slides
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: colors.primary,
  },
});

// ============== CONTENT WITH PROPER VIETNAMESE DIACRITICS ==============

// FDP Manifesto - 10 nguyên tắc bất biến (có dấu đầy đủ)
const manifestoItems = [
  { 
    number: '#1', 
    title: 'Không phải phần mềm kế toán', 
    desc: 'Phục vụ CEO/CFO điều hành doanh nghiệp, không phải nộp báo cáo thuế.' 
  },
  { 
    number: '#2', 
    title: 'Single Source of Truth', 
    desc: '1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Không có phiên bản khác.' 
  },
  { 
    number: '#3', 
    title: 'Truth > Flexibility', 
    desc: 'Không cho tự định nghĩa metric tuỳ tiện, không "chọn số đẹp".' 
  },
  { 
    number: '#4', 
    title: 'Real Cash', 
    desc: 'Phân biệt rõ: Cash đã về / sẽ về / có nguy cơ không về / đang bị khoá.' 
  },
  { 
    number: '#5', 
    title: 'Revenue gắn liền Cost', 
    desc: 'Mọi doanh thu đều đi kèm chi phí. Không có doanh thu "đứng một mình".' 
  },
  { 
    number: '#6', 
    title: 'Unit Economics dẫn đến Action', 
    desc: 'SKU lỗ + khoá cash + tăng risk = phải nói STOP.' 
  },
  { 
    number: '#7', 
    title: "Today's Decision", 
    desc: 'Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng.' 
  },
  { 
    number: '#8', 
    title: 'Surface Problems', 
    desc: 'Không làm đẹp số, không che anomaly, chỉ ra vấn đề sớm.' 
  },
  { 
    number: '#9', 
    title: 'Feed Control Tower', 
    desc: 'FDP là nguồn sự thật, Control Tower hành động dựa trên đó.' 
  },
  { 
    number: '#10', 
    title: 'Final Test', 
    desc: 'Nếu không khiến quyết định rõ ràng hơn thì FDP đã thất bại.' 
  },
];

// Why Bluecore - Pain/Solution matrix (có dấu đầy đủ)
const whyBluecoreItems = [
  { 
    pain: 'Dữ liệu phân tán', 
    painDesc: 'Data nằm rải rác trên nhiều hệ thống, không ai biết số nào đúng.',
    solution: 'Single Source of Truth',
    solutionDesc: 'Một nguồn dữ liệu duy nhất, tất cả cùng nhìn một con số.'
  },
  { 
    pain: 'Báo cáo chậm', 
    painDesc: 'Mất 3-5 ngày để đóng báo cáo cuối tháng, khi có số thì đã quá muộn.',
    solution: 'Dashboard Realtime',
    solutionDesc: 'Data cập nhật liên tục, biết ngay không cần chờ.'
  },
  { 
    pain: 'Quyết định mù', 
    painDesc: 'Thiếu data khi cần quyết định gấp, phải "đoán" thay vì "biết".',
    solution: 'Decision-first Platform',
    solutionDesc: 'Data sẵn sàng cho mọi quyết định, không cần gấp rút tìm kiếm.'
  },
  { 
    pain: 'Không biết cash thực', 
    painDesc: 'Chỉ biết doanh thu trên sổ sách, không biết tiền thật đã về chưa.',
    solution: 'Real Cash Tracking',
    solutionDesc: 'Phân biệt rõ cash đã về, sẽ về, và đang bị khoá.'
  },
  { 
    pain: 'SKU lỗ mà vẫn bán', 
    painDesc: 'Không biết unit economics, bán nhiều mà càng lỗ nhiều.',
    solution: 'Unit Economics Engine',
    solutionDesc: 'Biết chính xác SKU nào lãi, SKU nào lỗ để hành động.'
  },
];

// Comparison table data (có dấu đầy đủ)
const comparisonData = {
  headers: ['Tiêu chí', 'Excel', 'ERP', 'BI Tools', 'Bluecore FDP'],
  rows: [
    ['Thời gian triển khai', 'Vài ngày', 'Vài tháng', 'Vài tuần', 'Vài giờ'],
    ['Theo dõi cash thực', 'Không', 'Một phần', 'Không', 'Đầy đủ'],
    ['Unit Economics', 'Thủ công', 'Không', 'Một phần', 'Tự động'],
    ['Hỗ trợ quyết định', 'Không', 'Không', 'Chỉ charts', 'Decision-first'],
    ['Tập trung CEO/CFO', 'Không', 'Kế toán', 'IT focus', 'CEO/CFO'],
  ],
};

// Core capabilities (có dấu đầy đủ)
const coreCapabilities = [
  {
    badge: 'A',
    title: 'Dashboard Sự thật Duy nhất',
    desc: 'Một màn hình duy nhất cho tất cả KPIs quan trọng của doanh nghiệp.',
    features: [
      'Net Revenue, Gross Margin, Contribution Margin',
      'Cash Position realtime',
      'Cash Runway calculation',
      'Key alerts và anomalies'
    ],
  },
  {
    badge: 'B',
    title: 'Theo dõi Cash Thực',
    desc: 'Phân loại cash theo trạng thái thực tế, không phải số trên sổ sách.',
    features: [
      'Cash đã về tài khoản',
      'Cash sẽ về (AR pending)',
      'Cash có nguy cơ không về',
      'Cash đang bị khoá (Inventory, Ads, Ops)'
    ],
  },
  {
    badge: 'C',
    title: 'Unit Economics Engine',
    desc: 'P&L đến từng SKU, từng order để biết chính xác đâu lãi, đâu lỗ.',
    features: [
      'Revenue per SKU/Order',
      'COGS + Variable costs per unit',
      'Contribution margin per unit',
      'Xác định SKU đang thua lỗ'
    ],
  },
  {
    badge: 'D',
    title: 'Dự báo Cash & Runway',
    desc: 'Dự báo dòng tiền và cảnh báo sớm trước khi quá muộn.',
    features: [
      'Dự báo 30/60/90 ngày',
      'Cash runway calculation',
      'Phân tích burn rate',
      'What-if scenarios'
    ],
  },
];

// Feature details (có dấu đầy đủ)
const featureDetails = {
  finance: {
    title: 'Báo cáo Tài chính',
    items: [
      'P&L Report theo tháng/quý/năm',
      'Gross Margin & Operating Margin',
      'EBITDA breakdown',
      'Revenue theo Channel & Category',
      'Cost structure analysis'
    ],
  },
  working: {
    title: 'Vốn lưu động & CCC',
    items: [
      'DSO - Days Sales Outstanding',
      'DIO - Days Inventory Outstanding',
      'DPO - Days Payable Outstanding',
      'Cash Conversion Cycle',
      'Working Capital optimization'
    ],
  },
  arap: {
    title: 'Quản lý AR/AP',
    items: [
      'AR Aging Analysis',
      'Theo dõi hoá đơn quá hạn',
      'Dự báo thu tiền',
      'Lịch thanh toán AP tối ưu',
      'Cash gap analysis'
    ],
  },
  decision: {
    title: 'Hỗ trợ Quyết định',
    items: [
      'ROI Analysis calculator',
      'Tính toán NPV/IRR',
      'Sensitivity analysis',
      'What-if scenario planning',
      'Investment decision framework'
    ],
  },
};

// Outcome features (có dấu đầy đủ)
const outcomeFeatures = {
  before: {
    title: 'So sánh Before/After',
    items: [
      'Tự động capture metrics trước quyết định',
      'So sánh với kết quả thực tế sau action',
      'Tính toán variance và accuracy',
      'Gợi ý verdict dựa trên data'
    ],
  },
  roi: {
    title: 'Tính toán ROI',
    items: [
      'Đo lường impact tài chính thực tế',
      'So sánh với dự đoán ban đầu',
      'Cost vs Benefit analysis',
      'Cumulative ROI tracking'
    ],
  },
  learning: {
    title: 'Learning Feedback',
    items: [
      'Ghi nhận bài học từ mọi quyết định',
      'Build pattern recognition',
      'Cải thiện độ chính xác theo thời gian',
      'Knowledge base for team'
    ],
  },
  gqs: {
    title: 'Quality Score (GQS)',
    items: [
      'Governance Quality Score 0-100',
      'Track decision quality over time',
      'Xác định improvement areas',
      'Benchmark across teams'
    ],
  },
};

// Decision flow steps (có dấu đầy đủ)
const decisionSteps = [
  { number: '1', title: 'Phát hiện', desc: 'Alert từ hệ thống' },
  { number: '2', title: 'Phân tích', desc: 'Evidence & Context' },
  { number: '3', title: 'Quyết định', desc: 'Accept / Reject' },
  { number: '4', title: 'Đo lường', desc: 'Before vs After' },
];

const FDPSalesDeckPDF: React.FC = () => {
  return (
    <Document title="Bluecore FDP - Sales Deck" author="Bluecore">
      {/* Page 1: Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        <View style={[styles.coverOrnament, styles.coverCircle3]} />
        <Text style={styles.coverTitle}>Bluecore FDP</Text>
        <Text style={styles.coverSubtitle}>
          Nền tảng Dữ liệu Tài chính cho CEO & CFO điều hành{'\n'}
          Single Source of Truth cho mọi quyết định kinh doanh
        </Text>
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>FINANCIAL DATA PLATFORM</Text>
        </View>
        <Text style={styles.coverTagline}>Truth {'>'} Flexibility</Text>
      </Page>

      {/* Page 2: Why Bluecore */}
      <Page size="A4" style={styles.pageGradient}>
        <View style={styles.accentBar} />
        <View style={{ paddingLeft: 16 }}>
          <Text style={styles.eyebrowLabel}>Vấn đề</Text>
          <Text style={styles.sectionTitle}>Tại sao cần Bluecore?</Text>
          <Text style={styles.sectionSubtitle}>
            Những vấn đề phổ biến mà CEO/CFO gặp phải — và cách Bluecore giải quyết chúng.
          </Text>
          
          <View style={styles.whyContainer}>
            {whyBluecoreItems.map((item, index) => (
              <View key={index} style={styles.whyRow}>
                <View style={styles.whyPainColumn}>
                  <Text style={styles.whyLabelPain}>VẤN ĐỀ</Text>
                  <Text style={styles.whyPainTitle}>{item.pain}</Text>
                  <Text style={styles.whyPainDesc}>{item.painDesc}</Text>
                </View>
                <View style={styles.whySolutionColumn}>
                  <Text style={styles.whyLabelSolution}>GIẢI PHÁP BLUECORE</Text>
                  <Text style={styles.whySolutionTitle}>{item.solution}</Text>
                  <Text style={styles.whySolutionDesc}>{item.solutionDesc}</Text>
                </View>
              </View>
            ))}
          </View>
          
          <View style={styles.costBox}>
            <Text style={styles.costBoxTitle}>Chi phí của việc không hành động</Text>
            <Text style={styles.costBoxText}>
              Mỗi ngày chậm ra quyết định = mất tiền, mất cash, mất cơ hội. 
              Doanh nghiệp không chết vì quyết định sai — mà chết vì quyết định chậm.
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>2</Text>
        </View>
      </Page>

      {/* Page 3: Competitive Comparison */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>So sánh</Text>
        <Text style={styles.sectionTitle}>So sánh với giải pháp khác</Text>
        <Text style={styles.sectionSubtitle}>
          Bluecore FDP được thiết kế dành riêng cho CEO/CFO — không phải cho IT hay kế toán.
        </Text>
        
        <View style={styles.compTable}>
          <View style={styles.compHeaderRow}>
            {comparisonData.headers.map((header, index) => (
              <Text 
                key={index} 
                style={index === 0 ? styles.compHeaderCellFirst : styles.compHeaderCell}
              >
                {header}
              </Text>
            ))}
          </View>
          
          {comparisonData.rows.map((row, rowIndex) => (
            <View key={rowIndex} style={rowIndex % 2 === 0 ? styles.compRow : styles.compRowAlt}>
              {row.map((cell, cellIndex) => (
                <Text 
                  key={cellIndex} 
                  style={
                    cellIndex === 0 
                      ? styles.compCellFirst 
                      : cellIndex === 4 
                        ? styles.compCellHighlight 
                        : styles.compCell
                  }
                >
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
        
        <View style={styles.compHighlightBox}>
          <Text style={styles.compHighlightTitle}>Điểm khác biệt cốt lõi</Text>
          <Text style={styles.compHighlightText}>
            Bluecore FDP không chỉ là công cụ báo cáo — mà là nền tảng hỗ trợ quyết định.{'\n'}
            Triển khai trong vài giờ, thấy giá trị ngay lập tức.
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>3</Text>
        </View>
      </Page>

      {/* Page 4: Manifesto */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>Triết lý</Text>
        <Text style={styles.sectionTitleCenter}>FDP Manifesto</Text>
        <Text style={styles.sectionSubtitleCenter}>
          10 nguyên tắc bất biến của Financial Data Platform — những cam kết Bluecore không bao giờ thoả hiệp.
        </Text>
        
        <View style={styles.manifestoContainer}>
          {manifestoItems.map((item, index) => (
            <View key={index} style={styles.manifestoItem}>
              <Text style={styles.manifestoNumber}>{item.number}</Text>
              <Text style={styles.manifestoTitle}>{item.title}</Text>
              <Text style={styles.manifestoDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>4</Text>
        </View>
      </Page>

      {/* Page 5: Core Capabilities */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Năng lực</Text>
        <Text style={styles.sectionTitleCenter}>Core Capabilities</Text>
        <Text style={styles.sectionSubtitleCenter}>
          Những năng lực cốt lõi giúp CEO/CFO điều hành doanh nghiệp hiệu quả hơn.
        </Text>
        
        <View style={styles.capabilityGrid}>
          {coreCapabilities.map((cap, index) => (
            <View key={index} style={index % 2 === 0 ? styles.capabilityCard : styles.capabilityCardAlt}>
              <View style={styles.capabilityIconBadge}>
                <Text style={styles.capabilityIconText}>{cap.badge}</Text>
              </View>
              <Text style={styles.capabilityTitle}>{cap.title}</Text>
              <Text style={styles.capabilityDesc}>{cap.desc}</Text>
              <View style={styles.capabilityFeatures}>
                {cap.features.map((feature, fIndex) => (
                  <Text key={fIndex} style={styles.capabilityFeature}>• {feature}</Text>
                ))}
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>5</Text>
        </View>
      </Page>

      {/* Page 6: Feature Details */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>Chi tiết</Text>
        <Text style={styles.sectionTitleCenter}>Chức năng Chi tiết</Text>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>{featureDetails.finance.title}</Text>
            {featureDetails.finance.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>• {item}</Text>
            ))}
          </View>
          
          <View style={styles.featureColumnAlt}>
            <Text style={styles.featureColumnTitle}>{featureDetails.working.title}</Text>
            {featureDetails.working.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>• {item}</Text>
            ))}
          </View>
        </View>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumnAlt}>
            <Text style={styles.featureColumnTitle}>{featureDetails.arap.title}</Text>
            {featureDetails.arap.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>• {item}</Text>
            ))}
          </View>
          
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>{featureDetails.decision.title}</Text>
            {featureDetails.decision.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>• {item}</Text>
            ))}
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>6</Text>
        </View>
      </Page>

      {/* Page 7: Decision Flow */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Quy trình</Text>
        <Text style={styles.sectionTitleCenter}>Quy trình Quyết định</Text>
        <Text style={styles.sectionSubtitleCenter}>
          Từ phát hiện vấn đề đến đo lường kết quả — mọi quyết định đều được tracking.
        </Text>
        
        <View style={styles.decisionFlow}>
          {decisionSteps.map((step, index) => (
            <React.Fragment key={index}>
              <View style={styles.decisionStep}>
                <View style={styles.decisionStepCircle}>
                  <Text style={styles.decisionStepNumber}>{step.number}</Text>
                </View>
                <Text style={styles.decisionStepTitle}>{step.title}</Text>
                <Text style={styles.decisionStepDesc}>{step.desc}</Text>
              </View>
              {index < decisionSteps.length - 1 && (
                <Text style={styles.decisionArrow}>→</Text>
              )}
            </React.Fragment>
          ))}
        </View>
        
        <View style={styles.useCaseBox}>
          <Text style={styles.useCaseTitle}>Ví dụ: AR quá hạn cần thu hồi</Text>
          <Text style={styles.useCaseValue}>+3.4 Tỷ VNĐ</Text>
          <Text style={styles.useCaseDesc}>
            105 khách hàng có nợ quá hạn. Nếu thu hồi thành công trong 7-14 ngày,{'\n'}
            Cash Runway sẽ tăng thêm 0.9 tháng.
          </Text>
          
          <View style={styles.useCaseMetrics}>
            <View style={styles.useCaseMetric}>
              <Text style={styles.useCaseMetricValue}>105</Text>
              <Text style={styles.useCaseMetricLabel}>Khách hàng</Text>
            </View>
            <View style={styles.useCaseMetric}>
              <Text style={styles.useCaseMetricValue}>14 ngày</Text>
              <Text style={styles.useCaseMetricLabel}>Deadline</Text>
            </View>
            <View style={styles.useCaseMetric}>
              <Text style={styles.useCaseMetricValue}>+0.9 tháng</Text>
              <Text style={styles.useCaseMetricLabel}>Runway Impact</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>7</Text>
        </View>
      </Page>

      {/* Page 8: Outcome Tracking */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>Đo lường</Text>
        <Text style={styles.sectionTitleCenter}>Đo lường Kết quả Tự động</Text>
        <Text style={styles.sectionSubtitleCenter}>
          So sánh Before vs After — tracking outcome của mọi quyết định để học và cải thiện.
        </Text>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>{outcomeFeatures.before.title}</Text>
            {outcomeFeatures.before.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>• {item}</Text>
            ))}
          </View>
          
          <View style={styles.featureColumnAlt}>
            <Text style={styles.featureColumnTitle}>{outcomeFeatures.roi.title}</Text>
            {outcomeFeatures.roi.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>• {item}</Text>
            ))}
          </View>
        </View>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumnAlt}>
            <Text style={styles.featureColumnTitle}>{outcomeFeatures.learning.title}</Text>
            {outcomeFeatures.learning.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>• {item}</Text>
            ))}
          </View>
          
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>{outcomeFeatures.gqs.title}</Text>
            {outcomeFeatures.gqs.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>• {item}</Text>
            ))}
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>8</Text>
        </View>
      </Page>

      {/* Page 9: Contact/CTA */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        <View style={[styles.coverOrnament, styles.coverCircle3]} />
        <Text style={styles.contactTitle}>Bắt đầu với FDP</Text>
        <Text style={styles.contactSubtitle}>
          Liên hệ với chúng tôi để được demo trực tiếp{'\n'}
          và tư vấn giải pháp phù hợp với doanh nghiệp của bạn.
        </Text>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactItem}>contact@bluecore.vn</Text>
          <Text style={styles.contactItem}>+84 28 1234 5678</Text>
        </View>
        
        <View style={styles.contactCTA}>
          <Text style={styles.contactCTAText}>Đặt lịch Demo ngay</Text>
        </View>
        
        <View style={{ position: 'absolute', bottom: 40 }}>
          <Text style={{ fontSize: 12, color: colors.white, opacity: 0.6 }}>
            Truth {'>'} Flexibility
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default FDPSalesDeckPDF;
