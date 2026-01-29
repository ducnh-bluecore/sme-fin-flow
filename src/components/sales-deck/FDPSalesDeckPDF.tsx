/**
 * FDP Sales Deck PDF Generator - v2.0
 * 
 * 12-slide narrative deck telling the Cash Flow Story for SME Retail
 * [Hook] → [Pain] → [Root Cause] → [Solution] → [Use Cases] → [Daily Habit] → [Proof] → [CTA]
 * 
 * Vietnamese content with proper diacritics (tiếng Việt có dấu đầy đủ)
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
  dangerLight: '#fef2f2',  // Red 50
  dangerBorder: '#fecaca', // Red 200
  text: '#1f2937',         // Gray 800
  textLight: '#6b7280',    // Gray 500
  background: '#f8fafc',   // Slate 50
  backgroundAlt: '#e0f2fe', // Sky 100
  white: '#ffffff',
  black: '#000000',
  gradientStart: '#f0f9ff', // Sky 50
  gradientEnd: '#e0f2fe',   // Sky 100
  greenLight: '#ecfdf5',    // Green 50
  greenBorder: '#a7f3d0',   // Green 200
};

// Styles
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
  pageDark: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.primaryDark,
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
  
  // Section headers
  eyebrowLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  eyebrowLabelRed: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.danger,
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 10,
  },
  sectionTitleCenter: {
    fontSize: 26,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionTitleWhite: {
    fontSize: 26,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: 400,
    color: colors.textLight,
    marginBottom: 24,
    maxWidth: 480,
    lineHeight: 1.5,
  },
  sectionSubtitleCenter: {
    fontSize: 12,
    fontWeight: 400,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 420,
    alignSelf: 'center',
    lineHeight: 1.5,
  },
  
  // CEO Day Timeline (Page 2)
  timelineContainer: {
    marginTop: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  timelineTime: {
    width: 70,
    fontSize: 11,
    fontWeight: 700,
    color: colors.primary,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  timelineContentDanger: {
    flex: 1,
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  timelineText: {
    fontSize: 10,
    fontWeight: 400,
    color: colors.text,
    lineHeight: 1.4,
  },
  timelineHighlight: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.danger,
  },
  
  // Pain Points Grid (Page 3)
  painGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  painCard: {
    width: '48%',
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    marginBottom: 10,
  },
  painNumber: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.danger,
    marginBottom: 4,
  },
  painTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 6,
  },
  painBullet: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.textLight,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  
  // Cost Boxes (Page 4)
  costGrid: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 20,
  },
  costCard: {
    flex: 1,
    backgroundColor: colors.dangerLight,
    padding: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
  },
  costAmount: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.danger,
    marginBottom: 4,
  },
  costLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  costDesc: {
    fontSize: 8,
    fontWeight: 400,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 1.4,
  },
  quoteBox: {
    marginTop: 24,
    backgroundColor: colors.primaryDark,
    padding: 20,
    borderRadius: 10,
  },
  quoteText: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  
  // Solution positioning (Page 5)
  positioningStatement: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  positioningText: {
    fontSize: 11,
    fontWeight: 400,
    color: colors.text,
    lineHeight: 1.6,
  },
  threePillarsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  pillarCard: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  pillarIcon: {
    fontSize: 18,
    marginBottom: 6,
  },
  pillarTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  pillarDesc: {
    fontSize: 8,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 1.3,
  },
  solutionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  solutionCard: {
    width: '48%',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  solutionCardAlt: {
    width: '48%',
    backgroundColor: colors.backgroundAlt,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 10,
  },
  solutionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  solutionBadgeText: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.white,
  },
  solutionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 6,
  },
  solutionDesc: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  
  // Comparison table (Page 6)
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
    fontSize: 9,
    fontWeight: 700,
    color: colors.white,
    textAlign: 'center',
  },
  compHeaderCellFirst: {
    flex: 1.3,
    padding: 10,
    fontSize: 9,
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
    backgroundColor: colors.greenLight,
  },

  // Competitive Advantages (Page 6)
  advantagesSection: {
    marginTop: 16,
  },
  advantagesSectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 10,
  },
  advantageCard: {
    backgroundColor: colors.greenLight,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  advantageNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.accent,
    width: 24,
  },
  advantageContent: {
    flex: 1,
  },
  advantageTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 3,
  },
  advantageDesc: {
    fontSize: 8,
    fontWeight: 400,
    color: colors.textLight,
    lineHeight: 1.4,
  },

  // Story Box (Use Cases Pages 7-10)
  storyBox: {
    backgroundColor: colors.backgroundAlt,
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  storyTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  storyText: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.text,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  storyResult: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.accent,
    lineHeight: 1.4,
  },
  
  // Use Case Pages (Pages 7-10)
  useCaseContainer: {
    flex: 1,
  },
  useCaseQuestion: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 6,
  },
  useCaseAnswer: {
    fontSize: 11,
    fontWeight: 400,
    color: colors.textLight,
    marginBottom: 20,
  },
  
  // Stylized Mockup Diagram
  mockupContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  mockupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 12,
  },
  mockupTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.text,
  },
  mockupLive: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  mockupLiveText: {
    fontSize: 7,
    fontWeight: 700,
    color: colors.white,
  },
  
  // Mockup KPI cards
  mockupKPIRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  mockupKPICard: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mockupKPICardHighlight: {
    flex: 1,
    backgroundColor: colors.greenLight,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  mockupKPICardDanger: {
    flex: 1,
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.danger,
  },
  mockupKPILabel: {
    fontSize: 7,
    fontWeight: 400,
    color: colors.textLight,
    marginBottom: 4,
  },
  mockupKPIValue: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.primaryDark,
  },
  mockupKPIValueGreen: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.accent,
  },
  mockupKPIValueRed: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.danger,
  },
  
  // Mockup Table
  mockupTable: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  mockupTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  mockupTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  mockupTableCell: {
    flex: 1,
    padding: 6,
    fontSize: 7,
    fontWeight: 400,
    color: colors.text,
  },
  mockupTableCellHeader: {
    flex: 1,
    padding: 6,
    fontSize: 7,
    fontWeight: 700,
    color: colors.text,
  },
  mockupTableCellHighlight: {
    flex: 1,
    padding: 6,
    fontSize: 7,
    fontWeight: 700,
    color: colors.accent,
    backgroundColor: colors.greenLight,
  },
  mockupTableCellDanger: {
    flex: 1,
    padding: 6,
    fontSize: 7,
    fontWeight: 700,
    color: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  
  // Use Case Benefits
  benefitRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  benefitCard: {
    flex: 1,
    backgroundColor: colors.greenLight,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  benefitTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 8,
    fontWeight: 400,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  
  // Impact Box
  impactBox: {
    backgroundColor: colors.primaryDark,
    padding: 16,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.8,
  },
  impactValue: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.accent,
    marginTop: 4,
  },
  impactDesc: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.9,
    maxWidth: 200,
    lineHeight: 1.4,
  },
  
  // Manifesto (Page 11)
  manifestoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  manifestoCard: {
    width: '48%',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: 8,
  },
  manifestoNumber: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 3,
  },
  manifestoTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 3,
  },
  manifestoDesc: {
    fontSize: 7,
    fontWeight: 400,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  
  // Contact/CTA (Page 12)
  contactTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 14,
    textAlign: 'center',
  },
  contactSubtitle: {
    fontSize: 14,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 1.6,
  },
  contactInfo: {
    marginTop: 36,
    alignItems: 'center',
  },
  contactItem: {
    fontSize: 13,
    fontWeight: 400,
    color: colors.white,
    marginBottom: 8,
  },
  contactCTA: {
    marginTop: 28,
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  contactCTAText: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.white,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    fontWeight: 400,
    color: colors.textLight,
  },
  footerTextWhite: {
    fontSize: 8,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.6,
  },
  pageNumber: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.textLight,
  },
  pageNumberWhite: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.6,
  },
});

// ============== CONTENT DATA ==============

// CEO Day Timeline (Page 2)
const ceoDayTimeline = [
  { 
    time: '7:00 AM', 
    text: 'Doanh thu hôm qua 800 triệu, nhưng tiền thật về bao nhiêu?',
    danger: false,
  },
  { 
    time: '9:00 AM', 
    text: 'Nhà cung cấp đòi thanh toán 600 triệu hôm nay. Có đủ tiền không?',
    danger: true,
  },
  { 
    time: '11:00 AM', 
    text: 'Marketing xin thêm 200 triệu cho ads. Approve hay không?',
    danger: false,
  },
  { 
    time: '2:00 PM', 
    text: 'Kế toán nói có 2 tỷ trong tài khoản — nhưng 1.5 tỷ đang bị Shopee hold.',
    danger: true,
  },
  { 
    time: '5:00 PM', 
    text: 'Không biết nên approve hay reject yêu cầu mua hàng mới trị giá 500 triệu.',
    danger: true,
  },
];

// 5 Pain Points (Page 3)
const cashPainPoints = [
  {
    number: '01',
    title: 'Tiền bán hàng chưa phải tiền thật',
    bullets: [
      '• Shopee/Lazada hold 14-21 ngày',
      '• COD chưa đối soát xong',
      '• Return chưa xử lý',
    ],
  },
  {
    number: '02',
    title: 'Hàng tồn = Tiền chết',
    bullets: [
      '• 30% tồn kho là slow-moving',
      '• Mỗi ngày mất chi phí lưu kho',
      '• Không ai biết nên thanh lý SKU nào',
    ],
  },
  {
    number: '03',
    title: 'Marketing đốt tiền không biết ROI thật',
    bullets: [
      '• Chi 100 triệu ads → 300 triệu revenue',
      '• Nhưng COGS + logistics + return = lỗ?',
      '• Không có Unit Economics',
    ],
  },
  {
    number: '04',
    title: 'Công nợ "đẹp" trên sổ, xấu thực tế',
    bullets: [
      '• AR 2 tỷ, nhưng 800 triệu quá hạn 60+ ngày',
      '• Ai cần gọi hôm nay?',
      '• Khả năng thu hồi thực tế?',
    ],
  },
  {
    number: '05',
    title: 'Không biết còn bao lâu trước khi hết tiền',
    bullets: [
      '• Cash Runway là bao lâu?',
      '• Burn rate thực mỗi tháng?',
      '• Khi nào cần hành động?',
    ],
  },
];

// Cost of Not Knowing (Page 4)
const costItems = [
  {
    amount: '50-100tr',
    label: 'Quyết định chậm 1 tuần',
    desc: 'Mất cơ hội mua hàng giá tốt, không kịp react thị trường',
  },
  {
    amount: '30-80tr',
    label: 'SKU lỗ bán thêm 1 tháng',
    desc: 'Càng bán càng lỗ, khoá thêm vốn vào hàng tồn',
  },
  {
    amount: '20%',
    label: 'AR quá hạn 2 tháng',
    desc: 'Nguy cơ mất trắng công nợ nếu không hành động sớm',
  },
];

// Three Pillars (Page 5)
const threePillars = [
  {
    icon: '💵',
    title: 'REAL CASH',
    desc: 'Tiền thật, không tiền sổ sách',
  },
  {
    icon: '📊',
    title: 'TRUTH FIRST',
    desc: 'Không làm đẹp số, chỉ sự thật',
  },
  {
    icon: '⚡',
    title: 'ACTION NOW',
    desc: 'Quyết định hôm nay, không chờ',
  },
];

// Solution Cards (Page 5)
const solutionCards = [
  {
    badge: 'A',
    title: 'Cash Position',
    desc: 'Biết tiền THẬT trong 5 giây',
  },
  {
    badge: 'B',
    title: 'Unit Economics',
    desc: 'Biết SKU nào đang ăn tiền',
  },
  {
    badge: 'C',
    title: 'AR/AP Actions',
    desc: 'Biết ai cần gọi hôm nay',
  },
  {
    badge: 'D',
    title: 'Cash Forecast',
    desc: 'Biết runway còn bao lâu',
  },
];

// Comparison table (Page 6)
const comparisonData = {
  headers: ['Tiêu chí', 'Excel', 'ERP', 'BI Tools', 'Bluecore FDP'],
  rows: [
    ['Triển khai', 'Vài ngày', 'Vài tháng', 'Vài tuần', 'Vài giờ'],
    ['Theo dõi cash thực', 'Không', 'Một phần', 'Không', 'Đầy đủ'],
    ['Unit Economics', 'Thủ công', 'Không', 'Một phần', 'Tự động'],
    ['Hỗ trợ quyết định', 'Không', 'Không', 'Chỉ charts', 'Decision-first'],
    ['Tập trung CEO/CFO', 'Không', 'Kế toán', 'IT focus', 'CEO/CFO'],
  ],
};

// Competitive Advantages (Page 6)
const competitiveAdvantages = [
  {
    number: '#1',
    title: 'THIẾT KẾ CHO CEO/CFO, KHÔNG PHẢI IT',
    desc: 'Excel/ERP phục vụ kế toán và IT. Bluecore phục vụ người ra quyết định.',
  },
  {
    number: '#2',
    title: 'CASH THẬT, KHÔNG PHẢI SỐ SÁCH',
    desc: 'ERP cho bạn AR 3 tỷ. Bluecore cho bạn biết: 800 triệu có nguy cơ mất, 500 triệu cần gọi hôm nay.',
  },
  {
    number: '#3',
    title: 'TRIỂN KHAI TRONG GIỜ, KHÔNG PHẢI THÁNG',
    desc: 'ERP mất 3-6 tháng. BI mất 4-8 tuần training. Bluecore: kết nối data → thấy giá trị trong 1 ngày.',
  },
];

// Story Blocks for Use Cases (Pages 7-10)
const useCaseStories = {
  cashCheck: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'Anh Minh, CEO chuỗi thời trang 5 cửa hàng, mỗi sáng thứ Hai phải mất 2 giờ để hỏi kế toán: "Mình còn bao nhiêu tiền?" Kế toán nói 2 tỷ, nhưng 1.5 tỷ đang bị Shopee hold, 300 triệu là COD chưa đối soát.',
    result: '→ VỚI BLUECORE: Anh Minh mở app, 5 giây biết ngay: Cash thật: 500 triệu | Hold: 1.5 tỷ | Sẽ về: 800 triệu',
  },
  skuProfit: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'Chị Lan, founder shop mỹ phẩm online, tháng vừa rồi doanh thu 500 triệu nhưng cuối tháng hết tiền trả lương. Kiểm tra mới biết: 3 combo khuyến mãi đang bán lỗ, mỗi đơn mất 15k sau khi trừ COGS, ship, ads, return.',
    result: '→ VỚI BLUECORE: Chị Lan thấy ngay 3 SKU CM âm khi vào dashboard, dừng bán ngay, tiết kiệm 80 triệu.',
  },
  arCollection: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'Công ty thực phẩm của anh Hùng có AR 3 tỷ trên sổ. Nhưng 800 triệu đã quá hạn 60 ngày, 1 khách hàng lớn đang có dấu hiệu gặp khó khăn tài chính.',
    result: '→ VỚI BLUECORE: Anh Hùng có danh sách 5 khách cần gọi ngay hôm nay, thu hồi được 320 triệu trước khi mất.',
  },
  cashRunway: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'Startup của Tuấn đang burn 600 triệu/tháng. Cuối quý mới biết cash sắp cạn, vội vàng đi gọi vốn nhưng đã muộn — valuation bị ép vì thế yếu.',
    result: '→ VỚI BLUECORE: Tuấn biết trước 3 tháng runway sắp hết, có thời gian chuẩn bị fundraising, đàm phán từ vị thế mạnh hơn.',
  },
};

// FDP Manifesto condensed (Page 11)
const manifestoItems = [
  { number: '#1', title: 'Không phải phần mềm kế toán', desc: 'Phục vụ CEO/CFO điều hành, không nộp báo cáo thuế.' },
  { number: '#2', title: 'Single Source of Truth', desc: '1 Net Revenue, 1 Contribution Margin, 1 Cash Position.' },
  { number: '#3', title: 'Truth > Flexibility', desc: 'Không cho tự định nghĩa metric, không "chọn số đẹp".' },
  { number: '#4', title: 'Real Cash', desc: 'Phân biệt: Cash đã về / sẽ về / bị khoá / có nguy cơ mất.' },
  { number: '#5', title: 'Revenue gắn liền Cost', desc: 'Mọi doanh thu đều đi kèm chi phí tương ứng.' },
  { number: '#6', title: 'Unit Economics → Action', desc: 'SKU lỗ + khoá cash + tăng risk = phải nói STOP.' },
  { number: '#7', title: "Today's Decision", desc: 'Phục vụ quyết định hôm nay, không chờ cuối tháng.' },
  { number: '#8', title: 'Surface Problems', desc: 'Không làm đẹp số, chỉ ra vấn đề sớm.' },
  { number: '#9', title: 'Feed Control Tower', desc: 'FDP là nguồn sự thật cho mọi hành động.' },
  { number: '#10', title: 'Final Test', desc: 'Nếu không giúp quyết định rõ hơn = thất bại.' },
];

const FDPSalesDeckPDF: React.FC = () => {
  return (
    <Document title="Bluecore FDP - Sales Deck" author="Bluecore">
      {/* ========== Page 1: Cover ========== */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        <View style={[styles.coverOrnament, styles.coverCircle3]} />
        <Text style={styles.coverTitle}>Bluecore FDP</Text>
        <Text style={styles.coverSubtitle}>
          Nền tảng Dữ liệu Tài chính cho CEO & CFO{'\n'}
          Kể câu chuyện thật về dòng tiền của doanh nghiệp
        </Text>
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>FINANCIAL DATA PLATFORM</Text>
        </View>
        <Text style={styles.coverTagline}>Truth {'>'} Flexibility</Text>
      </Page>

      {/* ========== Page 2: Một ngày của CEO SME Retail ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>Câu chuyện</Text>
        <Text style={styles.sectionTitle}>Một ngày của CEO không biết mình còn bao nhiêu tiền</Text>
        <Text style={styles.sectionSubtitle}>
          Đây là câu chuyện thật xảy ra mỗi ngày tại hàng nghìn doanh nghiệp SME Retail Việt Nam.
        </Text>
        
        <View style={styles.timelineContainer}>
          {ceoDayTimeline.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <Text style={styles.timelineTime}>{item.time}</Text>
              <View style={item.danger ? styles.timelineContentDanger : styles.timelineContent}>
                <Text style={styles.timelineText}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.quoteBox}>
          <Text style={styles.quoteText}>
            "Cuối ngày, CEO vẫn không biết chắc mình còn bao nhiêu tiền THẬT để xài."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>2</Text>
        </View>
      </Page>

      {/* ========== Page 3: 5 điểm nghẹt dòng tiền ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabelRed}>Vấn đề</Text>
        <Text style={styles.sectionTitle}>5 điểm nghẹt dòng tiền mà Excel không thể hiện</Text>
        <Text style={styles.sectionSubtitle}>
          Những vấn đề "ẩn" khiến doanh nghiệp có doanh thu nhưng không có tiền.
        </Text>
        
        <View style={styles.painGrid}>
          {cashPainPoints.map((item, index) => (
            <View key={index} style={styles.painCard}>
              <Text style={styles.painNumber}>{item.number}</Text>
              <Text style={styles.painTitle}>{item.title}</Text>
              {item.bullets.map((bullet, bIndex) => (
                <Text key={bIndex} style={styles.painBullet}>{bullet}</Text>
              ))}
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>3</Text>
        </View>
      </Page>

      {/* ========== Page 4: Chi phí của việc "không biết" ========== */}
      <Page size="A4" style={styles.pageDark}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        
        <Text style={{ fontSize: 10, fontWeight: 700, color: colors.warning, letterSpacing: 1, marginBottom: 8 }}>Hệ quả</Text>
        <Text style={styles.sectionTitleWhite}>Mỗi ngày không biết = Mất tiền thật</Text>
        <Text style={{ fontSize: 12, fontWeight: 400, color: colors.white, opacity: 0.8, marginBottom: 28, lineHeight: 1.5 }}>
          Đây không phải lý thuyết — đây là những con số thực tế từ các doanh nghiệp SME Retail.
        </Text>
        
        <View style={styles.costGrid}>
          {costItems.map((item, index) => (
            <View key={index} style={styles.costCard}>
              <Text style={styles.costAmount}>{item.amount}</Text>
              <Text style={styles.costLabel}>{item.label}</Text>
              <Text style={styles.costDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
        
        <View style={[styles.quoteBox, { marginTop: 32, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.quoteText, { fontSize: 15 }]}>
            "Doanh nghiệp SME không chết vì quyết định sai —{'\n'}mà chết vì quyết định chậm."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerTextWhite}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumberWhite}>4</Text>
        </View>
      </Page>

      {/* ========== Page 5: Bluecore FDP là gì? (Enhanced with Positioning) ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>Định vị</Text>
        <Text style={styles.sectionTitle}>Bluecore FDP không phải BI — không phải ERP</Text>
        
        {/* Positioning Statement */}
        <View style={styles.positioningStatement}>
          <Text style={styles.positioningText}>
            Bluecore FDP là nền tảng dữ liệu tài chính duy nhất được thiết kế cho CEO và CFO SME Retail Việt Nam. Không phải công cụ báo cáo — mà là hệ thống hỗ trợ quyết định dựa trên dòng tiền thật.
          </Text>
        </View>
        
        {/* Three Pillars */}
        <View style={styles.threePillarsRow}>
          {threePillars.map((pillar, index) => (
            <View key={index} style={styles.pillarCard}>
              <Text style={styles.pillarIcon}>{pillar.icon}</Text>
              <Text style={styles.pillarTitle}>{pillar.title}</Text>
              <Text style={styles.pillarDesc}>{pillar.desc}</Text>
            </View>
          ))}
        </View>
        
        {/* Core Capabilities */}
        <View style={styles.solutionGrid}>
          {solutionCards.map((item, index) => (
            <View key={index} style={index % 2 === 0 ? styles.solutionCard : styles.solutionCardAlt}>
              <View style={styles.solutionBadge}>
                <Text style={styles.solutionBadgeText}>{item.badge}</Text>
              </View>
              <Text style={styles.solutionTitle}>{item.title}</Text>
              <Text style={styles.solutionDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Triển khai trong</Text>
            <Text style={styles.impactValue}>Vài giờ</Text>
          </View>
          <Text style={styles.impactDesc}>Không cần IT, không cần training phức tạp. Thấy giá trị ngay lập tức.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>5</Text>
        </View>
      </Page>

      {/* ========== Page 6: So sánh với đối thủ + Competitive Advantages ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>So sánh</Text>
        <Text style={styles.sectionTitle}>Tại sao chọn Bluecore FDP?</Text>
        <Text style={styles.sectionSubtitle}>
          So sánh với các giải pháp khác và lý do Bluecore khác biệt.
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
        
        {/* Competitive Advantages Section */}
        <View style={styles.advantagesSection}>
          <Text style={styles.advantagesSectionTitle}>TẠI SAO BLUECORE KHÁC BIỆT?</Text>
          {competitiveAdvantages.map((adv, index) => (
            <View key={index} style={styles.advantageCard}>
              <Text style={styles.advantageNumber}>{adv.number}</Text>
              <View style={styles.advantageContent}>
                <Text style={styles.advantageTitle}>{adv.title}</Text>
                <Text style={styles.advantageDesc}>{adv.desc}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={[styles.quoteBox, { marginTop: 12 }]}>
          <Text style={[styles.quoteText, { fontSize: 10 }]}>
            "Bluecore FDP không cạnh tranh với Excel hay ERP — chúng tôi giải quyết vấn đề họ không thể giải quyết."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>6</Text>
        </View>
      </Page>

      {/* ========== Page 7: Use Case 1 - Kiểm tra Cash sáng thứ Hai ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #1</Text>
        <Text style={styles.useCaseQuestion}>"Hôm nay mình có bao nhiêu tiền THẬT?"</Text>
        
        {/* Story Block */}
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.cashCheck.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.cashCheck.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.cashCheck.result}</Text>
        </View>
        
        {/* Stylized Mockup */}
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Cash Position Dashboard</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>LIVE</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>Tiền thật trong tài khoản</Text>
              <Text style={styles.mockupKPIValueGreen}>2.4 Tỷ</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Tiền đang bị Hold</Text>
              <Text style={styles.mockupKPIValue}>1.2 Tỷ</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Tiền sẽ về (7 ngày)</Text>
              <Text style={styles.mockupKPIValue}>800 Tr</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Cash Runway</Text>
              <Text style={styles.mockupKPIValue}>4.2 tháng</Text>
            </View>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>Cần thanh toán hôm nay</Text>
              <Text style={styles.mockupKPIValueRed}>650 Tr</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Không cần chờ kế toán</Text>
            <Text style={styles.benefitText}>Data tự động cập nhật từ bank, sàn TMĐT, POS</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Phân biệt tiền thật vs tiền sổ sách</Text>
            <Text style={styles.benefitText}>Biết rõ tiền đã về, đang hold, sẽ về, có nguy cơ</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Impact</Text>
            <Text style={styles.impactValue}>Giảm 90%</Text>
          </View>
          <Text style={styles.impactDesc}>Thời gian kiểm tra cash buổi sáng. Từ 2 giờ xuống còn 5 phút.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>7</Text>
        </View>
      </Page>

      {/* ========== Page 8: Use Case 2 - SKU nào đang "ăn" tiền? ========== */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>Use Case #2</Text>
        <Text style={styles.useCaseQuestion}>"Tại sao bán nhiều mà vẫn không có tiền?"</Text>
        
        {/* Story Block */}
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.skuProfit.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.skuProfit.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.skuProfit.result}</Text>
        </View>
        
        {/* Stylized Mockup - SKU Table */}
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Unit Economics by SKU</Text>
            <View style={[styles.mockupLive, { backgroundColor: colors.warning }]}>
              <Text style={styles.mockupLiveText}>3 SKU LỖ</Text>
            </View>
          </View>
          
          <View style={styles.mockupTable}>
            <View style={styles.mockupTableHeader}>
              <Text style={[styles.mockupTableCellHeader, { flex: 2 }]}>SKU</Text>
              <Text style={styles.mockupTableCellHeader}>Revenue</Text>
              <Text style={styles.mockupTableCellHeader}>COGS</Text>
              <Text style={styles.mockupTableCellHeader}>Logistics</Text>
              <Text style={styles.mockupTableCellHeader}>CM%</Text>
            </View>
            <View style={styles.mockupTableRow}>
              <Text style={[styles.mockupTableCell, { flex: 2 }]}>Áo polo nam premium</Text>
              <Text style={styles.mockupTableCell}>120tr</Text>
              <Text style={styles.mockupTableCell}>60tr</Text>
              <Text style={styles.mockupTableCell}>12tr</Text>
              <Text style={styles.mockupTableCellHighlight}>40%</Text>
            </View>
            <View style={styles.mockupTableRow}>
              <Text style={[styles.mockupTableCell, { flex: 2 }]}>Quần jean slim fit</Text>
              <Text style={styles.mockupTableCell}>85tr</Text>
              <Text style={styles.mockupTableCell}>55tr</Text>
              <Text style={styles.mockupTableCell}>15tr</Text>
              <Text style={styles.mockupTableCellHighlight}>18%</Text>
            </View>
            <View style={styles.mockupTableRow}>
              <Text style={[styles.mockupTableCell, { flex: 2 }]}>Váy đầm nữ sale</Text>
              <Text style={styles.mockupTableCell}>200tr</Text>
              <Text style={styles.mockupTableCell}>180tr</Text>
              <Text style={styles.mockupTableCell}>35tr</Text>
              <Text style={styles.mockupTableCellDanger}>-7.5%</Text>
            </View>
            <View style={styles.mockupTableRow}>
              <Text style={[styles.mockupTableCell, { flex: 2 }]}>Phụ kiện combo</Text>
              <Text style={styles.mockupTableCell}>45tr</Text>
              <Text style={styles.mockupTableCell}>42tr</Text>
              <Text style={styles.mockupTableCell}>8tr</Text>
              <Text style={styles.mockupTableCellDanger}>-11%</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Không chỉ Gross Margin</Text>
            <Text style={styles.benefitText}>Tính đủ COGS, logistics, return, platform fees</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Action ngay lập tức</Text>
            <Text style={styles.benefitText}>Dừng bán SKU lỗ, điều chỉnh giá, optimize ads</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Phát hiện</Text>
            <Text style={styles.impactValue}>15% SKU</Text>
          </View>
          <Text style={styles.impactDesc}>Đang có contribution margin âm — càng bán càng lỗ.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>8</Text>
        </View>
      </Page>

      {/* ========== Page 9: Use Case 3 - AR Collection ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #3</Text>
        <Text style={styles.useCaseQuestion}>"Ai đang nợ tiền mình?"</Text>
        
        {/* Story Block */}
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.arCollection.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.arCollection.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.arCollection.result}</Text>
        </View>
        
        {/* Stylized Mockup - AR Table */}
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>AR Collection Priority</Text>
            <View style={[styles.mockupLive, { backgroundColor: colors.danger }]}>
              <Text style={styles.mockupLiveText}>5 KHÁCH QUÁ HẠN</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Tổng AR</Text>
              <Text style={styles.mockupKPIValue}>3.2 Tỷ</Text>
            </View>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>Quá hạn 30+ ngày</Text>
              <Text style={styles.mockupKPIValueRed}>850 Tr</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Quá hạn 60+ ngày</Text>
              <Text style={styles.mockupKPIValue}>320 Tr</Text>
            </View>
          </View>
          
          <View style={styles.mockupTable}>
            <View style={styles.mockupTableHeader}>
              <Text style={[styles.mockupTableCellHeader, { flex: 2 }]}>Khách hàng</Text>
              <Text style={styles.mockupTableCellHeader}>Số tiền</Text>
              <Text style={styles.mockupTableCellHeader}>Quá hạn</Text>
              <Text style={styles.mockupTableCellHeader}>Ưu tiên</Text>
            </View>
            <View style={styles.mockupTableRow}>
              <Text style={[styles.mockupTableCell, { flex: 2 }]}>Công ty TNHH ABC</Text>
              <Text style={styles.mockupTableCell}>320 Tr</Text>
              <Text style={styles.mockupTableCellDanger}>45 ngày</Text>
              <Text style={[styles.mockupTableCell, { fontWeight: 700 }]}>GỌI NGAY</Text>
            </View>
            <View style={styles.mockupTableRow}>
              <Text style={[styles.mockupTableCell, { flex: 2 }]}>Shop XYZ - Shopee</Text>
              <Text style={styles.mockupTableCell}>180 Tr</Text>
              <Text style={styles.mockupTableCellDanger}>38 ngày</Text>
              <Text style={[styles.mockupTableCell, { fontWeight: 700 }]}>GỌI NGAY</Text>
            </View>
            <View style={styles.mockupTableRow}>
              <Text style={[styles.mockupTableCell, { flex: 2 }]}>Đại lý Miền Bắc</Text>
              <Text style={styles.mockupTableCell}>150 Tr</Text>
              <Text style={styles.mockupTableCell}>21 ngày</Text>
              <Text style={styles.mockupTableCell}>Tuần này</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Ưu tiên theo rủi ro</Text>
            <Text style={styles.benefitText}>Khách quá hạn lâu + số tiền lớn = gọi trước</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Tracking kết quả</Text>
            <Text style={styles.benefitText}>Ghi nhận outcome sau mỗi cuộc gọi thu hồi</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Thu hồi thêm</Text>
            <Text style={styles.impactValue}>500tr - 2 Tỷ</Text>
          </View>
          <Text style={styles.impactDesc}>Mỗi tháng nhờ action sớm với khách quá hạn.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>9</Text>
        </View>
      </Page>

      {/* ========== Page 10: Use Case 4 - Cash Runway Forecast ========== */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>Use Case #4</Text>
        <Text style={styles.useCaseQuestion}>"Còn bao lâu trước khi hết tiền?"</Text>
        
        {/* Story Block */}
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.cashRunway.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.cashRunway.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.cashRunway.result}</Text>
        </View>
        
        {/* Stylized Mockup - Runway Forecast */}
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Cash Runway Forecast</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>UPDATED TODAY</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>Cash Runway hiện tại</Text>
              <Text style={styles.mockupKPIValueGreen}>4.2 tháng</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Burn Rate / tháng</Text>
              <Text style={styles.mockupKPIValue}>580 Tr</Text>
            </View>
          </View>
          
          {/* Simplified forecast visualization */}
          <View style={{ marginTop: 10, padding: 12, backgroundColor: colors.background, borderRadius: 8 }}>
            <Text style={{ fontSize: 8, fontWeight: 700, color: colors.text, marginBottom: 10 }}>DỰ BÁO 90 NGÀY</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: colors.textLight }}>Hôm nay</Text>
                <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>2.4 Tỷ</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: colors.textLight }}>+30 ngày</Text>
                <Text style={{ fontSize: 12, fontWeight: 700, color: colors.primary }}>1.8 Tỷ</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: colors.textLight }}>+60 ngày</Text>
                <Text style={{ fontSize: 12, fontWeight: 700, color: colors.warning }}>1.2 Tỷ</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: colors.textLight }}>+90 ngày</Text>
                <Text style={{ fontSize: 12, fontWeight: 700, color: colors.danger }}>600 Tr</Text>
              </View>
            </View>
            
            {/* Progress bar visualization */}
            <View style={{ height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden', flexDirection: 'row' }}>
              <View style={{ width: '60%', backgroundColor: colors.accent }} />
              <View style={{ width: '20%', backgroundColor: colors.warning }} />
              <View style={{ width: '20%', backgroundColor: colors.danger }} />
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>What-if Scenarios</Text>
            <Text style={styles.benefitText}>Nếu tăng chi ads 20%? Nếu AR thu chậm 1 tháng?</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Cảnh báo sớm</Text>
            <Text style={styles.benefitText}>Alert khi runway xuống dưới ngưỡng an toàn</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Biết trước</Text>
            <Text style={styles.impactValue}>2-3 tháng</Text>
          </View>
          <Text style={styles.impactDesc}>Nếu cash sắp cạn, có thời gian để hành động.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>10</Text>
        </View>
      </Page>

      {/* ========== Page 11: FDP Manifesto (Condensed) ========== */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>Triết lý</Text>
        <Text style={styles.sectionTitleCenter}>FDP Manifesto</Text>
        <Text style={styles.sectionSubtitleCenter}>
          10 nguyên tắc bất biến của Financial Data Platform — những cam kết Bluecore không bao giờ thoả hiệp.
        </Text>
        
        <View style={styles.manifestoGrid}>
          {manifestoItems.map((item, index) => (
            <View key={index} style={styles.manifestoCard}>
              <Text style={styles.manifestoNumber}>{item.number}</Text>
              <Text style={styles.manifestoTitle}>{item.title}</Text>
              <Text style={styles.manifestoDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>11</Text>
        </View>
      </Page>

      {/* ========== Page 12: Contact/CTA ========== */}
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
        
        <View style={{ position: 'absolute', bottom: 36 }}>
          <Text style={{ fontSize: 11, color: colors.white, opacity: 0.6 }}>
            Truth {'>'} Flexibility
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default FDPSalesDeckPDF;
