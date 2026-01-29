/**
 * MDP Sales Deck PDF Generator - v1.0
 * 
 * 12-slide narrative deck telling the Marketing ROI Story for SME Retail
 * Tagline: "Profit before Performance"
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

// Brand colors - Purple theme for MDP
const colors = {
  primary: '#8b5cf6',      // Purple
  primaryDark: '#5b21b6',  // Dark purple
  accent: '#10b981',       // Green
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  dangerLight: '#fef2f2',  // Red 50
  dangerBorder: '#fecaca', // Red 200
  text: '#1f2937',         // Gray 800
  textLight: '#6b7280',    // Gray 500
  background: '#f8fafc',   // Slate 50
  backgroundAlt: '#f3e8ff', // Purple 100
  white: '#ffffff',
  black: '#000000',
  gradientStart: '#faf5ff', // Purple 50
  gradientEnd: '#f3e8ff',   // Purple 100
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
    borderColor: '#c4b5fd',
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
    color: colors.accent,
    textAlign: 'center',
    backgroundColor: colors.greenLight,
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

  // Story Box
  storyBox: {
    backgroundColor: colors.backgroundAlt,
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#c4b5fd',
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
  
  // Benefits
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

// Marketing Day Timeline (Page 2)
const marketingDayTimeline = [
  { 
    time: '8:00 AM', 
    text: 'Facebook Ads đã chi 50 triệu trong 3 ngày, ROAS đang 3.0 — nhưng có lãi không?',
    danger: false,
  },
  { 
    time: '10:00 AM', 
    text: 'Shopee Ads report nói doanh thu 200 triệu, nhưng sau trừ COGS, phí, ship, return thì còn gì?',
    danger: true,
  },
  { 
    time: '1:00 PM', 
    text: 'CEO hỏi: "Tăng ngân sách marketing lên 100 triệu/tuần, sẽ lãi thêm bao nhiêu?"',
    danger: false,
  },
  { 
    time: '3:00 PM', 
    text: 'Tối ưu CPM, CPC, CTR cả tuần — nhưng cashflow vẫn âm?',
    danger: true,
  },
  { 
    time: '6:00 PM', 
    text: 'Cuối tháng, marketing báo cáo ROAS 4.0. CFO hỏi: "Vậy tại sao lợi nhuận giảm?"',
    danger: true,
  },
];

// 5 Marketing Pain Points (Page 3)
const marketingPainPoints = [
  {
    number: '01',
    title: 'ROAS cao nhưng vẫn lỗ',
    bullets: [
      '• Revenue ROAS 4.0 không có nghĩa lãi',
      '• COGS 50-60% chưa ai tính',
      '• Phí platform + ship + return = ?',
    ],
  },
  {
    number: '02',
    title: 'Ads đốt tiền mà không biết',
    bullets: [
      '• Một số campaigns đang "burning cash"',
      '• Không có Profit ROAS nên không biết',
      '• Tối ưu sai metric (CPM, CPC)',
    ],
  },
  {
    number: '03',
    title: 'Marketing tách rời Cash Flow',
    bullets: [
      '• Ads chi ngay, tiền về sau 14-21 ngày',
      '• Cash conversion cycle không ai theo dõi',
      '• Đang "tài trợ" cho Shopee/Lazada',
    ],
  },
  {
    number: '04',
    title: 'Scale sai campaign',
    bullets: [
      '• ROAS cao → scale lên → lỗ nặng hơn',
      '• Không có "KILL signal" từ finance',
      '• CEO chỉ thấy hậu quả cuối tháng',
    ],
  },
  {
    number: '05',
    title: 'Không biết Marketing ROI thật',
    bullets: [
      '• Marketing impact trên lợi nhuận = ?',
      '• Chi 1 đồng marketing, kiếm được bao nhiêu?',
      '• Cash bị khoá trong marketing là bao nhiêu?',
    ],
  },
];

// Cost of Marketing Blindness (Page 4)
const costItems = [
  {
    amount: '30-50%',
    label: 'Budget bị đốt vào campaigns lỗ',
    desc: 'Campaigns có ROAS cao nhưng Profit ROAS âm',
  },
  {
    amount: '2-3 tuần',
    label: 'Delay phát hiện vấn đề',
    desc: 'Đợi đến cuối tháng mới biết marketing không hiệu quả',
  },
  {
    amount: '100%',
    label: 'Cash bị khoá vô hình',
    desc: 'Chi trước, thu sau nhưng không ai tính cashflow impact',
  },
];

// Three Pillars (Page 5)
const threePillars = [
  {
    icon: '💰',
    title: 'PROFIT ROAS',
    desc: 'Lợi nhuận thật, không revenue ảo',
  },
  {
    icon: '🎯',
    title: 'KILL SIGNAL',
    desc: 'Biết khi nào phải dừng ngay',
  },
  {
    icon: '💵',
    title: 'CASH IMPACT',
    desc: 'Marketing ảnh hưởng cashflow thế nào',
  },
];

// Solution Cards (Page 5)
const solutionCards = [
  {
    badge: 'A',
    title: 'Profit ROAS',
    desc: 'ROAS tính đủ COGS, phí, return',
  },
  {
    badge: 'B',
    title: 'Decision Cards',
    desc: 'KILL / PAUSE / SCALE recommendations',
  },
  {
    badge: 'C',
    title: 'Cash at Risk',
    desc: 'Bao nhiêu tiền đang bị khoá trong ads',
  },
  {
    badge: 'D',
    title: 'Net Marketing Impact',
    desc: 'Tổng lợi nhuận thật từ marketing',
  },
];

// Comparison table (Page 6)
const comparisonData = {
  headers: ['Tiêu chí', 'Google Analytics', 'Ads Manager', 'BI Tools', 'Bluecore MDP'],
  rows: [
    ['Profit ROAS', 'Không', 'Không', 'Một phần', 'Đầy đủ'],
    ['Unit Economics', 'Không', 'Không', 'Không', 'Tự động'],
    ['Cash Impact', 'Không', 'Không', 'Không', 'Real-time'],
    ['Decision Cards', 'Không', 'Không', 'Charts', 'KILL/SCALE'],
    ['CEO/CFO focus', 'Không', 'Marketer', 'IT', 'Decision-first'],
  ],
};

// Competitive Advantages (Page 6)
const competitiveAdvantages = [
  {
    number: '#1',
    title: 'PROFIT ROAS, KHÔNG PHẢI REVENUE ROAS',
    desc: 'Ads Manager nói ROAS 4.0. MDP nói: sau trừ chi phí, bạn đang lỗ 15% mỗi đơn.',
  },
  {
    number: '#2',
    title: 'DECISION CARDS CHO CEO, KHÔNG PHẢI CHARTS CHO MARKETER',
    desc: 'Không cần biết CTR hay CPM. Chỉ cần biết: KILL hay SCALE campaign này?',
  },
  {
    number: '#3',
    title: 'MARKETING GẮN LIỀN CASHFLOW',
    desc: 'Biết chính xác marketing đang khoá bao nhiêu tiền và khi nào tiền sẽ về.',
  },
];

// Story Blocks for Use Cases (Pages 7-10)
const useCaseStories = {
  profitRoas: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'Chị Hằng, Marketing Manager của một shop thời trang, báo cáo ROAS 4.0 cho Facebook Ads. CEO rất hài lòng và cho tăng budget. 2 tháng sau, lợi nhuận giảm 40% dù doanh thu tăng.',
    result: '→ VỚI MDP: Chị Hằng thấy Profit ROAS chỉ có 0.6 — mỗi đơn từ ads đang lỗ 35%. Dừng ngay campaign, tiết kiệm 180 triệu/tháng.',
  },
  killSignal: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'Anh Dũng chạy 15 campaigns song song trên Shopee, Lazada, TikTok. Không có thời gian phân tích từng cái. Cuối tháng mới biết 6 campaigns đang "burning cash".',
    result: '→ VỚI MDP: Decision Cards tự động báo 🔴 KILL cho 6 campaigns có CM âm. Anh Dũng dừng ngay, chuyển budget sang 3 campaigns 🟢 SCALE.',
  },
  cashImpact: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'Startup của Linh chi 200 triệu/tháng cho ads. Doanh thu tăng đẹp, nhưng tháng nào cũng thiếu tiền trả lương. Linh không hiểu tại sao.',
    result: '→ VỚI MDP: Dashboard Cash at Risk cho thấy 500 triệu đang bị khoá (chi trước, thu sau 21 ngày). Linh điều chỉnh ngân sách phù hợp cashflow.',
  },
  netImpact: {
    title: '📖 TÌNH HUỐNG THỰC TẾ',
    text: 'CFO của công ty mỹ phẩm hỏi CMO: "Marketing có đóng góp gì cho lợi nhuận không?" CMO không trả lời được vì chỉ có số ROAS và clicks.',
    result: '→ VỚI MDP: Net Marketing Impact = 320 triệu lợi nhuận thật từ tất cả channels. CFO hiểu rõ giá trị marketing, approve tăng budget.',
  },
};

// MDP Manifesto condensed (Page 11)
const manifestoItems = [
  { number: '#1', title: 'Không phải MarTech', desc: 'Không chạy ads, không quản campaign — đo lường giá trị tài chính thật.' },
  { number: '#2', title: 'Profit before Performance', desc: 'Không quan tâm CTR, CPM — chỉ quan tâm lợi nhuận.' },
  { number: '#3', title: 'Phục vụ CEO/CFO trước', desc: 'Marketer buộc phải điều chỉnh, không phải CEO phải hiểu.' },
  { number: '#4', title: 'Profit Attribution', desc: 'Mỗi campaign được truy tới Contribution Margin.' },
  { number: '#5', title: 'Marketing gắn liền Cashflow', desc: 'Tiền về nhanh hay chậm? Cash bị khoá bao nhiêu?' },
  { number: '#6', title: 'Nuôi FDP & Control Tower', desc: 'MDP không đứng riêng — là nguồn signal cho Decision OS.' },
  { number: '#7', title: 'Risk trước Thành tích', desc: 'Phát hiện marketing đốt tiền trước khi tôn vinh scale.' },
  { number: '#8', title: 'Attribution đơn giản', desc: 'Không AI magic khó giải thích — logic CFO tin được.' },
  { number: '#9', title: 'Không scale vô trách nhiệm', desc: 'Mỗi quyết định phải trả lời: lãi hay lỗ? cash impact?' },
  { number: '#10', title: 'Final Test', desc: 'Nếu không làm quyết định marketing rõ hơn = thất bại.' },
];

const MDPSalesDeckPDF: React.FC = () => {
  return (
    <Document title="Bluecore MDP - Sales Deck" author="Bluecore">
      {/* ========== Page 1: Cover ========== */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        <View style={[styles.coverOrnament, styles.coverCircle3]} />
        <Text style={styles.coverTitle}>Bluecore MDP</Text>
        <Text style={styles.coverSubtitle}>
          Nền tảng Dữ liệu Marketing cho CEO & CFO{'\n'}
          Đo lường giá trị tài chính thật của Marketing
        </Text>
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>MARKETING DATA PLATFORM</Text>
        </View>
        <Text style={styles.coverTagline}>Profit {'>'} Performance</Text>
      </Page>

      {/* ========== Page 2: Một ngày của CMO/Marketing Manager ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>Câu chuyện</Text>
        <Text style={styles.sectionTitle}>Marketing có ROAS cao — nhưng công ty vẫn lỗ?</Text>
        <Text style={styles.sectionSubtitle}>
          Đây là câu chuyện xảy ra mỗi ngày tại hàng nghìn doanh nghiệp eCommerce Việt Nam.
        </Text>
        
        <View style={styles.timelineContainer}>
          {marketingDayTimeline.map((item, index) => (
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
            "ROAS 4.0 không có nghĩa là lãi — nếu không trừ đủ chi phí."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore MDP - Marketing Data Platform</Text>
          <Text style={styles.pageNumber}>2</Text>
        </View>
      </Page>

      {/* ========== Page 3: 5 vấn đề Marketing ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabelRed}>Vấn đề</Text>
        <Text style={styles.sectionTitle}>5 lỗ hổng khiến Marketing đốt tiền</Text>
        <Text style={styles.sectionSubtitle}>
          Những vấn đề "ẩn" mà Google Analytics và Ads Manager không thể hiện.
        </Text>
        
        <View style={styles.painGrid}>
          {marketingPainPoints.map((item, index) => (
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
          <Text style={styles.footerText}>Bluecore MDP - Marketing Data Platform</Text>
          <Text style={styles.pageNumber}>3</Text>
        </View>
      </Page>

      {/* ========== Page 4: Chi phí của "Marketing mù" ========== */}
      <Page size="A4" style={styles.pageDark}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        
        <Text style={{ fontSize: 10, fontWeight: 700, color: colors.warning, letterSpacing: 1, marginBottom: 8 }}>Hệ quả</Text>
        <Text style={styles.sectionTitleWhite}>Marketing đang đốt bao nhiêu tiền mà bạn không biết?</Text>
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
            "Marketing không phải chi phí — nhưng marketing SAI là chi phí chìm."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerTextWhite}>Bluecore MDP - Marketing Data Platform</Text>
          <Text style={styles.pageNumberWhite}>4</Text>
        </View>
      </Page>

      {/* ========== Page 5: Bluecore MDP là gì? ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>Định vị</Text>
        <Text style={styles.sectionTitle}>Bluecore MDP không phải MarTech — không phải Analytics</Text>
        
        <View style={styles.positioningStatement}>
          <Text style={styles.positioningText}>
            Bluecore MDP là nền tảng đo lường giá trị tài chính thật của Marketing. Không tối ưu ads — mà cho CEO/CFO biết: Marketing đang tạo ra hay phá huỷ bao nhiêu giá trị?
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
          <Text style={styles.impactDesc}>Kết nối data → Decision Cards ngay lập tức. Không cần training phức tạp.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore MDP - Marketing Data Platform</Text>
          <Text style={styles.pageNumber}>5</Text>
        </View>
      </Page>

      {/* ========== Page 6: So sánh + Competitive Advantages ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>So sánh</Text>
        <Text style={styles.sectionTitle}>Tại sao chọn Bluecore MDP?</Text>
        <Text style={styles.sectionSubtitle}>
          So sánh với các công cụ marketing phổ biến và lý do MDP khác biệt.
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
          <Text style={styles.advantagesSectionTitle}>TẠI SAO MDP KHÁC BIỆT?</Text>
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
            "MDP không cạnh tranh với Google Analytics hay Ads Manager — chúng tôi trả lời câu hỏi họ không thể trả lời."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore MDP - Marketing Data Platform</Text>
          <Text style={styles.pageNumber}>6</Text>
        </View>
      </Page>

      {/* ========== Page 7: Use Case 1 - Profit ROAS ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #1</Text>
        <Text style={styles.useCaseQuestion}>"Campaign này có lãi thật không?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.profitRoas.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.profitRoas.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.profitRoas.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Profit ROAS Dashboard</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>LIVE</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Revenue ROAS</Text>
              <Text style={styles.mockupKPIValue}>4.0</Text>
            </View>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>Profit ROAS</Text>
              <Text style={styles.mockupKPIValueRed}>0.6</Text>
            </View>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>CM per Order</Text>
              <Text style={styles.mockupKPIValueRed}>-35K</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Không bị đánh lừa bởi Revenue</Text>
            <Text style={styles.benefitText}>Profit ROAS trừ đủ COGS, phí platform, ship, return, ads cost.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Quyết định ngay lập tức</Text>
            <Text style={styles.benefitText}>Biết campaign nào cần dừng trước khi đốt thêm tiền.</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Tiết kiệm trung bình</Text>
            <Text style={styles.impactValue}>20-40%</Text>
          </View>
          <Text style={styles.impactDesc}>Budget bằng cách dừng campaigns có Profit ROAS âm.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore MDP - Marketing Data Platform</Text>
          <Text style={styles.pageNumber}>7</Text>
        </View>
      </Page>

      {/* ========== Page 8: Use Case 2 - Kill/Scale Signal ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #2</Text>
        <Text style={styles.useCaseQuestion}>"Nên dừng hay scale campaign này?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.killSignal.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.killSignal.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.killSignal.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Marketing Decision Cards</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>LIVE</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>🔴 KILL</Text>
              <Text style={styles.mockupKPIValueRed}>6</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>🟡 PAUSE</Text>
              <Text style={styles.mockupKPIValue}>4</Text>
            </View>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>🟢 SCALE</Text>
              <Text style={styles.mockupKPIValueGreen}>3</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Không cần phân tích</Text>
            <Text style={styles.benefitText}>Decision Cards tự động báo KILL / PAUSE / SCALE.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Dựa trên Finance, không phải Clicks</Text>
            <Text style={styles.benefitText}>Quyết định dựa trên CM và Profit ROAS, không phải CTR.</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Thời gian tiết kiệm</Text>
            <Text style={styles.impactValue}>5+ giờ/tuần</Text>
          </View>
          <Text style={styles.impactDesc}>Không cần export data, không cần tự tính. Decision ngay trong dashboard.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore MDP - Marketing Data Platform</Text>
          <Text style={styles.pageNumber}>8</Text>
        </View>
      </Page>

      {/* ========== Page 9: Use Case 3 - Cash Impact ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #3</Text>
        <Text style={styles.useCaseQuestion}>"Marketing đang khoá bao nhiêu tiền?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.cashImpact.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.cashImpact.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.cashImpact.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Cash at Risk Dashboard</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>LIVE</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Chi quảng cáo (tuần)</Text>
              <Text style={styles.mockupKPIValue}>50 Tr</Text>
            </View>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>Cash đang bị khoá</Text>
              <Text style={styles.mockupKPIValueRed}>500 Tr</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Thời gian thu hồi</Text>
              <Text style={styles.mockupKPIValue}>21 ngày</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Hiểu Cashflow Impact</Text>
            <Text style={styles.benefitText}>Marketing chi trước, thu sau — biết chính xác gap.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Điều chỉnh budget theo cash</Text>
            <Text style={styles.benefitText}>Không scale quá khả năng cashflow chịu được.</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Tránh được</Text>
            <Text style={styles.impactValue}>Cash crunch</Text>
          </View>
          <Text style={styles.impactDesc}>Biết trước khi nào tiền sẽ về, khi nào cần giảm budget.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore MDP - Marketing Data Platform</Text>
          <Text style={styles.pageNumber}>9</Text>
        </View>
      </Page>

      {/* ========== Page 10: Use Case 4 - Net Marketing Impact ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #4</Text>
        <Text style={styles.useCaseQuestion}>"Marketing đóng góp bao nhiêu cho lợi nhuận?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.netImpact.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.netImpact.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.netImpact.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Net Marketing Impact</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>THIS MONTH</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>Net Marketing Impact</Text>
              <Text style={styles.mockupKPIValueGreen}>+320 Tr</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Total Ad Spend</Text>
              <Text style={styles.mockupKPIValue}>180 Tr</Text>
            </View>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>ROI</Text>
              <Text style={styles.mockupKPIValueGreen}>1.8x</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Số để báo cáo CEO/CFO</Text>
            <Text style={styles.benefitText}>Không phải ROAS hay clicks — mà là lợi nhuận thật bằng tiền.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Cơ sở xin tăng budget</Text>
            <Text style={styles.benefitText}>Chứng minh ROI rõ ràng, CFO sẽ approve tăng budget.</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Marketing team</Text>
            <Text style={styles.impactValue}>Có tiếng nói</Text>
          </View>
          <Text style={styles.impactDesc}>Nói chuyện bằng ngôn ngữ finance, được CEO/CFO tin tưởng.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore MDP - Marketing Data Platform</Text>
          <Text style={styles.pageNumber}>10</Text>
        </View>
      </Page>

      {/* ========== Page 11: MDP Manifesto ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>Manifesto</Text>
        <Text style={styles.sectionTitle}>10 Nguyên tắc của Bluecore MDP</Text>
        <Text style={styles.sectionSubtitle}>
          Những nguyên tắc bất biến định hình cách MDP hoạt động.
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
          <Text style={styles.footerText}>Bluecore MDP - Marketing Data Platform</Text>
          <Text style={styles.pageNumber}>11</Text>
        </View>
      </Page>

      {/* ========== Page 12: CTA ========== */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        
        <Text style={styles.contactTitle}>Sẵn sàng thấy giá trị thật{'\n'}của Marketing?</Text>
        <Text style={styles.contactSubtitle}>
          Kết nối data và thấy Profit ROAS của từng campaign trong 24 giờ.
        </Text>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactItem}>📧 contact@bluecore.vn</Text>
          <Text style={styles.contactItem}>🌐 bluecore.vn</Text>
        </View>
        
        <View style={styles.contactCTA}>
          <Text style={styles.contactCTAText}>Đặt lịch Demo</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerTextWhite}>Bluecore MDP - Marketing Data Platform</Text>
          <Text style={styles.pageNumberWhite}>12</Text>
        </View>
      </Page>
    </Document>
  );
};

export default MDPSalesDeckPDF;
