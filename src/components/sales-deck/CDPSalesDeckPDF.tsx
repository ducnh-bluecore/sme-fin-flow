/**
 * CDP Sales Deck PDF Generator - v1.0
 * 
 * 12-slide narrative deck telling the Customer Intelligence Story for SME Retail
 * Tagline: "Population > Individual"
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

// Brand colors - Green theme for CDP
const colors = {
  primary: '#10b981',      // Green
  primaryDark: '#047857',  // Dark green
  accent: '#8b5cf6',       // Purple
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  dangerLight: '#fef2f2',  // Red 50
  dangerBorder: '#fecaca', // Red 200
  text: '#1f2937',         // Gray 800
  textLight: '#6b7280',    // Gray 500
  background: '#f8fafc',   // Slate 50
  backgroundAlt: '#ecfdf5', // Green 50
  white: '#ffffff',
  black: '#000000',
  gradientStart: '#ecfdf5', // Green 50
  gradientEnd: '#d1fae5',   // Green 100
  purpleLight: '#f5f3ff',   // Purple 50
  purpleBorder: '#c4b5fd',  // Purple 300
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
  
  // Timeline
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
  
  // Pain Points Grid
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
  
  // Cost Boxes
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
  
  // Solution positioning
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
    borderColor: '#a7f3d0',
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
  
  // Comparison table
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
    color: colors.primary,
    textAlign: 'center',
    backgroundColor: colors.backgroundAlt,
  },

  // Competitive Advantages
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
    backgroundColor: colors.backgroundAlt,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  advantageNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.primary,
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

  // Story Box
  storyBox: {
    backgroundColor: colors.backgroundAlt,
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
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
  
  // Use Case Pages
  useCaseQuestion: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 6,
  },
  
  // Mockup
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
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  mockupLiveText: {
    fontSize: 7,
    fontWeight: 700,
    color: colors.white,
  },
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
    backgroundColor: colors.backgroundAlt,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
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
    color: colors.primary,
  },
  mockupKPIValueRed: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.danger,
  },
  
  // Benefits
  benefitRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  benefitCard: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
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
  
  // Manifesto
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
  
  // Contact/CTA
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

// Customer Day Timeline (Page 2)
const customerDayTimeline = [
  { 
    time: '8:00 AM', 
    text: 'Có 50,000 khách hàng trong database, nhưng bao nhiêu người thực sự có giá trị?',
    danger: false,
  },
  { 
    time: '10:00 AM', 
    text: 'Marketing chạy campaign cho TẤT CẢ khách hàng — chi phí x10, hiệu quả chỉ từ 5%.',
    danger: true,
  },
  { 
    time: '1:00 PM', 
    text: 'CFO hỏi: "Customer Lifetime Value của chúng ta là bao nhiêu?" — Không ai trả lời được.',
    danger: false,
  },
  { 
    time: '3:00 PM', 
    text: 'Top 100 khách hàng VIP năm ngoái, 40 người đã ngừng mua. Không ai biết.',
    danger: true,
  },
  { 
    time: '6:00 PM', 
    text: 'Cuối tháng, doanh thu giảm 20% mà không biết nguyên nhân là mất khách hay khách mua ít hơn.',
    danger: true,
  },
];

// 5 Customer Pain Points (Page 3)
const customerPainPoints = [
  {
    number: '01',
    title: 'Không biết khách nào có giá trị',
    bullets: [
      '• 50,000 khách nhưng ai đáng để giữ?',
      '• CLV = ? Không ai tính được',
      '• Đối xử như nhau với mọi khách hàng',
    ],
  },
  {
    number: '02',
    title: 'Mất khách VIP mà không biết',
    bullets: [
      '• Top 10% khách mang lại 60% doanh thu',
      '• Khi họ bỏ đi, mất vài tháng mới phát hiện',
      '• Quá muộn để win back',
    ],
  },
  {
    number: '03',
    title: 'Customer Equity là bao nhiêu?',
    bullets: [
      '• Tổng giá trị khách hàng = ?',
      '• Dự báo doanh thu 12 tháng từ khách hiện tại?',
      '• Không có số để báo cáo investor',
    ],
  },
  {
    number: '04',
    title: 'Marketing đồng loạt, phí phạm',
    bullets: [
      '• Gửi email/SMS cho TẤT CẢ',
      '• Chi 100 triệu, chỉ 5% khách phản hồi',
      '• Không biết segment nào có ROI cao',
    ],
  },
  {
    number: '05',
    title: 'Hành vi thay đổi, không ai biết',
    bullets: [
      '• Khách trước mua 5 lần/tháng, giờ còn 1 lần',
      '• Basket size giảm 30% mà không ai notice',
      '• Không có signal để hành động',
    ],
  },
];

// Cost of Customer Blindness (Page 4)
const costItems = [
  {
    amount: '30-50%',
    label: 'Khách VIP mất mà không biết',
    desc: 'Churn của top 10% khách = mất 60% tiềm năng revenue',
  },
  {
    amount: '10x',
    label: 'Chi phí marketing phí phạm',
    desc: 'Spray & pray thay vì target đúng segment',
  },
  {
    amount: '???',
    label: 'Customer Equity không xác định',
    desc: 'Không có số để định giá, không thể raise fund',
  },
];

// Three Pillars (Page 5)
const threePillars = [
  {
    icon: '👥',
    title: 'POPULATION',
    desc: 'Phân tích tổng thể, không cá nhân',
  },
  {
    icon: '📊',
    title: 'SHIFT',
    desc: 'Phát hiện thay đổi hành vi sớm',
  },
  {
    icon: '💰',
    title: 'EQUITY',
    desc: 'Khách hàng là tài sản tài chính',
  },
];

// Solution Cards (Page 5)
const solutionCards = [
  {
    badge: 'A',
    title: 'Customer Equity',
    desc: 'Tổng giá trị của toàn bộ customer base',
  },
  {
    badge: 'B',
    title: 'CLV by Segment',
    desc: 'Giá trị vòng đời từng nhóm khách',
  },
  {
    badge: 'C',
    title: 'Churn Signals',
    desc: 'Phát hiện khách sắp rời bỏ',
  },
  {
    badge: 'D',
    title: 'Behavioral Shifts',
    desc: 'Cảnh báo thay đổi hành vi mua',
  },
];

// Comparison table (Page 6)
const comparisonData = {
  headers: ['Tiêu chí', 'CRM', 'Email Tools', 'BI Tools', 'Bluecore CDP'],
  rows: [
    ['Customer Equity', 'Không', 'Không', 'Một phần', 'Đầy đủ'],
    ['CLV Calculation', 'Không', 'Không', 'Thủ công', 'Tự động'],
    ['Churn Detection', 'Không', 'Không', 'Không', 'Real-time'],
    ['Behavioral Signals', 'Không', 'Open rate', 'Charts', 'Actionable'],
    ['Financial Focus', 'Activities', 'Campaigns', 'Reports', 'Decision-first'],
  ],
};

// Competitive Advantages (Page 6)
const competitiveAdvantages = [
  {
    number: '#1',
    title: 'KHÁCH HÀNG = TÀI SẢN TÀI CHÍNH',
    desc: 'CRM xem khách là contact. CDP xem khách là asset có thể định giá bằng tiền.',
  },
  {
    number: '#2',
    title: 'POPULATION, KHÔNG PHẢI INDIVIDUAL',
    desc: 'Không làm CRM. Phân tích cohort, segment, percentile để thấy bức tranh lớn.',
  },
  {
    number: '#3',
    title: 'SHIFT > SNAPSHOT',
    desc: 'Không chỉ biết hiện tại mà còn phát hiện thay đổi — trước khi quá muộn.',
  },
];

// Story Blocks for Use Cases (Pages 7-10)
const useCaseStories = {
  customerEquity: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'Chị Mai, founder startup eCommerce, đang gọi vốn Series A. Investor hỏi: "Customer Equity của bạn là bao nhiêu?" Chị Mai chỉ có số revenue và customer count — không có tổng giá trị tài sản khách hàng.',
    result: '→ VỚI CDP: Chị Mai trình bày: Customer Equity = 12 tỷ, 24M Forecast = 18 tỷ. Investor hiểu rõ giá trị, deal thành công.',
  },
  churnDetection: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'Shop thời trang của anh Khoa có 200 khách VIP (top 5%). Cuối năm check lại, 40 người đã ngừng mua từ 6 tháng trước. Mất 30% doanh thu tiềm năng mà không hay biết.',
    result: '→ VỚI CDP: Signal "CLV Decay" báo ngay khi khách VIP giảm tần suất mua. Anh Khoa win back được 25 khách, giữ lại 120 triệu/năm.',
  },
  segmentValue: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'Marketing team của Linh chạy campaign cho TẤT CẢ 50,000 khách, chi 100 triệu. Chỉ 2,500 người mua. Linh không biết segment nào có ROI cao nhất.',
    result: '→ VỚI CDP: CLV by Segment cho thấy top 10% khách có ROI gấp 8x. Linh focus budget vào segment này, tiết kiệm 70% chi phí, doanh thu tăng 40%.',
  },
  behavioralShift: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'Shop mỹ phẩm của Hoa thấy doanh thu giảm 15% nhưng số khách không đổi. Không hiểu tại sao. 3 tháng sau mới biết: basket size giảm từ 350k xuống 220k.',
    result: '→ VỚI CDP: Behavioral Shift signal "BASKET_COLLAPSE" báo ngay khi AOV giảm 20%. Hoa điều chỉnh pricing strategy kịp thời.',
  },
};

// CDP Manifesto condensed (Page 11)
const manifestoItems = [
  { number: '#1', title: 'Không phải CRM', desc: 'Không gửi email, không task. Chỉ phân tích giá trị tài chính.' },
  { number: '#2', title: 'Customer = Financial Asset', desc: 'Định giá khách hàng như tài sản có thể đo đếm.' },
  { number: '#3', title: 'Population > Individual', desc: 'Phân tích cohort, segment — không từng người một.' },
  { number: '#4', title: 'Shift > Snapshot', desc: 'Phát hiện thay đổi, không chỉ báo cáo trạng thái.' },
  { number: '#5', title: 'Insight = Money or Risk', desc: 'Mỗi insight phải gắn với số tiền hoặc rủi ro.' },
  { number: '#6', title: 'Feed Control Tower', desc: 'CDP signal nuôi Decision OS để hành động.' },
  { number: '#7', title: 'No Soft Metrics', desc: 'Không clicks, opens. Chỉ revenue, profit, churn.' },
  { number: '#8', title: 'Equity Transparency', desc: 'Mọi estimation đều ghi rõ nguồn và confidence.' },
  { number: '#9', title: 'Early Warning', desc: 'Báo sớm, không chờ cuối quý mới biết mất khách.' },
  { number: '#10', title: 'Final Test', desc: 'Nếu không giúp hiểu giá trị khách hàng rõ hơn = thất bại.' },
];

const CDPSalesDeckPDF: React.FC = () => {
  return (
    <Document title="Bluecore CDP - Sales Deck" author="Bluecore">
      {/* ========== Page 1: Cover ========== */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        <View style={[styles.coverOrnament, styles.coverCircle3]} />
        <Text style={styles.coverTitle}>Bluecore CDP</Text>
        <Text style={styles.coverSubtitle}>
          Nền tảng Dữ liệu Khách hàng cho CEO & CFO{'\n'}
          Xem khách hàng như tài sản tài chính
        </Text>
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>CUSTOMER DATA PLATFORM</Text>
        </View>
        <Text style={styles.coverTagline}>Population {'>'} Individual</Text>
      </Page>

      {/* ========== Page 2: Câu chuyện Customer ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>Câu chuyện</Text>
        <Text style={styles.sectionTitle}>50,000 khách hàng — nhưng có giá trị bao nhiêu?</Text>
        <Text style={styles.sectionSubtitle}>
          Đây là câu chuyện xảy ra mỗi ngày tại hàng nghìn doanh nghiệp eCommerce Việt Nam.
        </Text>
        
        <View style={styles.timelineContainer}>
          {customerDayTimeline.map((item, index) => (
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
            "Số lượng khách hàng không có nghĩa — giá trị khách hàng mới quan trọng."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore CDP - Customer Data Platform</Text>
          <Text style={styles.pageNumber}>2</Text>
        </View>
      </Page>

      {/* ========== Page 3: 5 vấn đề Customer ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabelRed}>Vấn đề</Text>
        <Text style={styles.sectionTitle}>5 lỗ hổng khiến doanh nghiệp mất khách VIP</Text>
        <Text style={styles.sectionSubtitle}>
          Những vấn đề "ẩn" mà CRM và Email Tools không thể hiện.
        </Text>
        
        <View style={styles.painGrid}>
          {customerPainPoints.map((item, index) => (
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
          <Text style={styles.footerText}>Bluecore CDP - Customer Data Platform</Text>
          <Text style={styles.pageNumber}>3</Text>
        </View>
      </Page>

      {/* ========== Page 4: Chi phí của "Customer mù" ========== */}
      <Page size="A4" style={styles.pageDark}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        
        <Text style={{ fontSize: 10, fontWeight: 700, color: colors.warning, letterSpacing: 1, marginBottom: 8 }}>Hệ quả</Text>
        <Text style={styles.sectionTitleWhite}>Không biết giá trị khách hàng = Mất tiền thật</Text>
        <Text style={{ fontSize: 12, fontWeight: 400, color: colors.white, opacity: 0.8, marginBottom: 28, lineHeight: 1.5 }}>
          Đây không phải lý thuyết — đây là những con số thực từ các doanh nghiệp eCommerce.
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
            "Khách hàng không phải chi phí để acquire —{'\n'}mà là tài sản để nuôi dưỡng và bảo vệ."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerTextWhite}>Bluecore CDP - Customer Data Platform</Text>
          <Text style={styles.pageNumberWhite}>4</Text>
        </View>
      </Page>

      {/* ========== Page 5: Bluecore CDP là gì? ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>Định vị</Text>
        <Text style={styles.sectionTitle}>Bluecore CDP không phải CRM — không phải Email Tool</Text>
        
        <View style={styles.positioningStatement}>
          <Text style={styles.positioningText}>
            Bluecore CDP xem khách hàng như tài sản tài chính. Không gửi email, không làm campaign — mà định giá, theo dõi, và phát hiện thay đổi giá trị của customer base.
          </Text>
        </View>
        
        <View style={styles.threePillarsRow}>
          {threePillars.map((pillar, index) => (
            <View key={index} style={styles.pillarCard}>
              <Text style={styles.pillarIcon}>{pillar.icon}</Text>
              <Text style={styles.pillarTitle}>{pillar.title}</Text>
              <Text style={styles.pillarDesc}>{pillar.desc}</Text>
            </View>
          ))}
        </View>
        
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
            <Text style={styles.impactLabel}>Thấy giá trị trong</Text>
            <Text style={styles.impactValue}>24 giờ</Text>
          </View>
          <Text style={styles.impactDesc}>Kết nối order data → Customer Equity và CLV ngay lập tức.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore CDP - Customer Data Platform</Text>
          <Text style={styles.pageNumber}>5</Text>
        </View>
      </Page>

      {/* ========== Page 6: So sánh + Competitive Advantages ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>So sánh</Text>
        <Text style={styles.sectionTitle}>Tại sao chọn Bluecore CDP?</Text>
        <Text style={styles.sectionSubtitle}>
          So sánh với các công cụ CRM phổ biến và lý do CDP khác biệt.
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
        
        <View style={styles.advantagesSection}>
          <Text style={styles.advantagesSectionTitle}>TẠI SAO CDP KHÁC BIỆT?</Text>
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
            "CDP không cạnh tranh với CRM hay Email Tools — chúng tôi trả lời câu hỏi họ không thể trả lời."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore CDP - Customer Data Platform</Text>
          <Text style={styles.pageNumber}>6</Text>
        </View>
      </Page>

      {/* ========== Page 7: Use Case 1 - Customer Equity ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #1</Text>
        <Text style={styles.useCaseQuestion}>"Customer Equity là bao nhiêu?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.customerEquity.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.customerEquity.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.customerEquity.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Customer Equity Dashboard</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>LIVE</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>Customer Equity (12M)</Text>
              <Text style={styles.mockupKPIValueGreen}>12.4 Tỷ</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>24M Forecast</Text>
              <Text style={styles.mockupKPIValue}>18.2 Tỷ</Text>
            </View>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>At-Risk Value</Text>
              <Text style={styles.mockupKPIValueRed}>1.8 Tỷ</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Số để báo cáo Investor</Text>
            <Text style={styles.benefitText}>Customer Equity = valuation asset. Định giá công ty chính xác hơn.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Theo dõi tài sản thật</Text>
            <Text style={styles.benefitText}>Customer base tăng hay giảm giá trị theo thời gian.</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Dùng cho</Text>
            <Text style={styles.impactValue}>Fundraising</Text>
          </View>
          <Text style={styles.impactDesc}>Customer Equity là số Investor muốn thấy — không phải customer count.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore CDP - Customer Data Platform</Text>
          <Text style={styles.pageNumber}>7</Text>
        </View>
      </Page>

      {/* ========== Page 8: Use Case 2 - Churn Detection ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #2</Text>
        <Text style={styles.useCaseQuestion}>"Khách VIP nào đang rời bỏ?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.churnDetection.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.churnDetection.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.churnDetection.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Churn Risk Dashboard</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>LIVE</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>VIP At Risk</Text>
              <Text style={styles.mockupKPIValueRed}>23</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Potential Loss</Text>
              <Text style={styles.mockupKPIValue}>320 Tr</Text>
            </View>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>Win-back Rate</Text>
              <Text style={styles.mockupKPIValueGreen}>62%</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Phát hiện sớm</Text>
            <Text style={styles.benefitText}>Signal báo ngay khi khách VIP giảm tần suất mua.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Win-back kịp thời</Text>
            <Text style={styles.benefitText}>Còn thời gian để cứu khách trước khi mất hẳn.</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Giữ lại trung bình</Text>
            <Text style={styles.impactValue}>60% VIP</Text>
          </View>
          <Text style={styles.impactDesc}>Phát hiện sớm = cơ hội win back cao hơn.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore CDP - Customer Data Platform</Text>
          <Text style={styles.pageNumber}>8</Text>
        </View>
      </Page>

      {/* ========== Page 9: Use Case 3 - Segment Value ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #3</Text>
        <Text style={styles.useCaseQuestion}>"Segment nào có giá trị cao nhất?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.segmentValue.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.segmentValue.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.segmentValue.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>CLV by Segment</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>LIVE</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>Top 10% CLV</Text>
              <Text style={styles.mockupKPIValueGreen}>4.2 Tr</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Middle 40% CLV</Text>
              <Text style={styles.mockupKPIValue}>850K</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Bottom 50% CLV</Text>
              <Text style={styles.mockupKPIValue}>120K</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Focus budget đúng chỗ</Text>
            <Text style={styles.benefitText}>Marketing spend vào segment có ROI cao nhất.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Không spray & pray</Text>
            <Text style={styles.benefitText}>Tiết kiệm chi phí, tăng hiệu quả marketing.</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Tiết kiệm</Text>
            <Text style={styles.impactValue}>70% chi phí</Text>
          </View>
          <Text style={styles.impactDesc}>Bằng cách chỉ focus vào segment có giá trị cao.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore CDP - Customer Data Platform</Text>
          <Text style={styles.pageNumber}>9</Text>
        </View>
      </Page>

      {/* ========== Page 10: Use Case 4 - Behavioral Shift ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #4</Text>
        <Text style={styles.useCaseQuestion}>"Hành vi khách hàng đang thay đổi thế nào?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.behavioralShift.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.behavioralShift.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.behavioralShift.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Behavioral Signals</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>LIVE</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>BASKET_COLLAPSE</Text>
              <Text style={styles.mockupKPIValueRed}>-28%</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>FREQUENCY_DROP</Text>
              <Text style={styles.mockupKPIValue}>-15%</Text>
            </View>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>CATEGORY_SHIFT</Text>
              <Text style={styles.mockupKPIValueGreen}>+12%</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Biết trước khi quá muộn</Text>
            <Text style={styles.benefitText}>Signal báo ngay khi hành vi thay đổi, không chờ cuối quý.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Hiểu nguyên nhân</Text>
            <Text style={styles.benefitText}>Doanh thu giảm do mất khách hay khách mua ít hơn?</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Phát hiện sớm</Text>
            <Text style={styles.impactValue}>2-3 tháng</Text>
          </View>
          <Text style={styles.impactDesc}>Trước khi vấn đề thể hiện trong báo cáo tài chính.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore CDP - Customer Data Platform</Text>
          <Text style={styles.pageNumber}>10</Text>
        </View>
      </Page>

      {/* ========== Page 11: CDP Manifesto ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>Manifesto</Text>
        <Text style={styles.sectionTitle}>10 Nguyên tắc của Bluecore CDP</Text>
        <Text style={styles.sectionSubtitle}>
          Những nguyên tắc bất biến định hình cách CDP hoạt động.
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
          <Text style={styles.footerText}>Bluecore CDP - Customer Data Platform</Text>
          <Text style={styles.pageNumber}>11</Text>
        </View>
      </Page>

      {/* ========== Page 12: CTA ========== */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        
        <Text style={styles.contactTitle}>Sẵn sàng biết giá trị{'\n'}Customer Base?</Text>
        <Text style={styles.contactSubtitle}>
          Kết nối order data và thấy Customer Equity ngay trong 24 giờ.
        </Text>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactItem}>📧 contact@bluecore.vn</Text>
          <Text style={styles.contactItem}>🌐 bluecore.vn</Text>
        </View>
        
        <View style={styles.contactCTA}>
          <Text style={styles.contactCTAText}>Đặt lịch Demo</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerTextWhite}>Bluecore CDP - Customer Data Platform</Text>
          <Text style={styles.pageNumberWhite}>12</Text>
        </View>
      </Page>
    </Document>
  );
};

export default CDPSalesDeckPDF;
