/**
 * FDP Sales Deck PDF Generator - v3.0 (WOW Edition)
 * 
 * 12-slide narrative deck telling the Cash Flow Story for SME Retail
 * Enhanced with AI-generated mockup images and infographic elements
 * 
 * [Hook] → [Pain] → [Root Cause] → [Solution] → [Use Cases] → [Daily Habit] → [Proof] → [CTA]
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
  Image,
} from '@react-pdf/renderer';

// Get base URL dynamically for font and image loading
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
  primaryDeep: '#1e3a5f',  // Deeper blue
  accent: '#10b981',       // Green
  accentLight: '#34d399',  // Light green
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
  gold: '#fbbf24',          // Amber 400
  purple: '#8b5cf6',        // Purple
  cyan: '#06b6d4',          // Cyan
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
  pageDarkDeep: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.primaryDeep,
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
  eyebrowLabelGold: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.gold,
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
  
  // Infographic Stats (Page 2)
  infographicRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  infographicStat: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  infographicStatAlt: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  infographicNumber: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primaryDark,
  },
  infographicNumberWhite: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.white,
  },
  infographicLabel: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  infographicLabelWhite: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Pain Points Grid (Page 3) - Enhanced with icons
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
    fontSize: 20,
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
  painIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  painIconText: {
    fontSize: 16,
    color: colors.danger,
  },
  
  // Cost Boxes (Page 4) - Enhanced infographic style
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
  costCardEnhanced: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  costAmount: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.danger,
    marginBottom: 4,
  },
  costAmountWhite: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 4,
  },
  costLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  costLabelWhite: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.white,
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
  costDescWhite: {
    fontSize: 8,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.8,
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
  
  // Use Case Pages with AI Images (Pages 7-10)
  useCaseContainer: {
    flex: 1,
  },
  useCaseQuestion: {
    fontSize: 22,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 6,
  },
  useCaseAnswer: {
    fontSize: 11,
    fontWeight: 400,
    color: colors.textLight,
    marginBottom: 16,
  },
  
  // AI Mockup Image container
  mockupImageContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mockupImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    objectFit: 'cover',
  },
  mockupImageLarge: {
    width: '100%',
    height: 240,
    borderRadius: 8,
    objectFit: 'cover',
  },
  mockupCaption: {
    fontSize: 8,
    fontWeight: 400,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Enhanced Benefit Row with icons
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
  
  // Impact Box - Enhanced
  impactBox: {
    backgroundColor: colors.primaryDark,
    padding: 16,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactBoxGradient: {
    backgroundColor: colors.accent,
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
    fontSize: 22,
    fontWeight: 700,
    color: colors.accentLight,
    marginTop: 4,
  },
  impactValueWhite: {
    fontSize: 22,
    fontWeight: 700,
    color: colors.white,
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
  
  // Manifesto (Page 11) - Enhanced grid
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
    fontSize: 10,
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
  
  // Feature highlight strip
  featureStrip: {
    flexDirection: 'row',
    backgroundColor: colors.primaryDark,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 16,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureLabel: {
    fontSize: 7,
    fontWeight: 400,
    color: colors.white,
    textAlign: 'center',
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
    icon: '💸',
  },
  {
    number: '02',
    title: 'Hàng tồn = Tiền chết',
    bullets: [
      '• 30% tồn kho là slow-moving',
      '• Mỗi ngày mất chi phí lưu kho',
      '• Không ai biết nên thanh lý SKU nào',
    ],
    icon: '📦',
  },
  {
    number: '03',
    title: 'Marketing đốt tiền không biết ROI thật',
    bullets: [
      '• Chi 100 triệu ads → 300 triệu revenue',
      '• Nhưng COGS + logistics + return = lỗ?',
      '• Không có Unit Economics',
    ],
    icon: '📉',
  },
  {
    number: '04',
    title: 'Công nợ "đẹp" trên sổ, xấu thực tế',
    bullets: [
      '• AR 2 tỷ, nhưng 800 triệu quá hạn 60+ ngày',
      '• Ai cần gọi hôm nay?',
      '• Khả năng thu hồi thực tế?',
    ],
    icon: '⏰',
  },
  {
    number: '05',
    title: 'Không biết còn bao lâu trước khi hết tiền',
    bullets: [
      '• Cash Runway là bao lâu?',
      '• Burn rate thực mỗi tháng?',
      '• Khi nào cần hành động?',
    ],
    icon: '🚨',
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

// Solution Cards (Page 5)
const solutionCards = [
  {
    badge: 'A',
    title: 'Cash Position Realtime',
    desc: 'Biết chính xác tiền thật trong tài khoản, tiền đang bị hold, tiền sẽ về.',
  },
  {
    badge: 'B',
    title: 'Unit Economics Engine',
    desc: 'P&L đến từng SKU, từng order — biết ngay đâu lãi, đâu lỗ.',
  },
  {
    badge: 'C',
    title: 'AR/AP Action List',
    desc: 'Danh sách khách cần gọi hôm nay, vendor cần trì hoãn thanh toán.',
  },
  {
    badge: 'D',
    title: 'Cash Runway Forecast',
    desc: 'Dự báo 30/60/90 ngày, biết trước 2-3 tháng nếu cash sắp cạn.',
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

// AI Mockup image paths
const getMockupImages = () => {
  const base = getBaseUrl();
  return {
    cashPosition: `${base}/sales-deck/cash-position-mockup.png`,
    unitEconomics: `${base}/sales-deck/unit-economics-mockup.png`,
    arAging: `${base}/sales-deck/ar-aging-mockup.png`,
    runwayForecast: `${base}/sales-deck/runway-forecast-mockup.png`,
  };
};

const FDPSalesDeckPDF: React.FC = () => {
  const mockupImages = getMockupImages();
  
  return (
    <Document title="Bluecore FDP - Sales Deck v3.0" author="Bluecore">
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
        <Text style={styles.eyebrowLabel}>CÂU CHUYỆN THẬT</Text>
        <Text style={styles.sectionTitle}>Một ngày của CEO không biết mình còn bao nhiêu tiền</Text>
        
        {/* Infographic Stats Row */}
        <View style={styles.infographicRow}>
          <View style={styles.infographicStat}>
            <Text style={styles.infographicNumber}>72%</Text>
            <Text style={styles.infographicLabel}>CEO SME không biết{'\n'}cash thật mỗi ngày</Text>
          </View>
          <View style={styles.infographicStatAlt}>
            <Text style={styles.infographicNumberWhite}>3-5 giờ</Text>
            <Text style={styles.infographicLabelWhite}>Thời gian CEO mất mỗi{'\n'}tuần để kiểm tra số</Text>
          </View>
          <View style={styles.infographicStat}>
            <Text style={styles.infographicNumber}>40%</Text>
            <Text style={styles.infographicLabel}>Cash bị "khoá" trong{'\n'}operations hàng ngày</Text>
          </View>
        </View>
        
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
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>2</Text>
        </View>
      </Page>

      {/* ========== Page 3: 5 điểm nghẹt dòng tiền ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabelRed}>VẤN ĐỀ CỐT LÕI</Text>
        <Text style={styles.sectionTitle}>5 điểm nghẹt dòng tiền mà Excel không thể hiện</Text>
        <Text style={styles.sectionSubtitle}>
          Những vấn đề "ẩn" khiến doanh nghiệp có doanh thu nhưng không có tiền.
        </Text>
        
        <View style={styles.painGrid}>
          {cashPainPoints.map((item, index) => (
            <View key={index} style={styles.painCard}>
              <View style={styles.painIcon}>
                <Text style={styles.painIconText}>{item.icon}</Text>
              </View>
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
      <Page size="A4" style={styles.pageDarkDeep}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        
        <Text style={styles.eyebrowLabelGold}>💰 HỆ QUẢ TÀI CHÍNH</Text>
        <Text style={styles.sectionTitleWhite}>Mỗi ngày không biết = Mất tiền thật</Text>
        <Text style={{ fontSize: 12, fontWeight: 400, color: colors.white, opacity: 0.8, marginBottom: 28, lineHeight: 1.5 }}>
          Đây không phải lý thuyết — đây là những con số thực tế từ các doanh nghiệp SME Retail.
        </Text>
        
        <View style={styles.costGrid}>
          {costItems.map((item, index) => (
            <View key={index} style={styles.costCardEnhanced}>
              <Text style={styles.costAmountWhite}>{item.amount}</Text>
              <Text style={styles.costLabelWhite}>{item.label}</Text>
              <Text style={styles.costDescWhite}>{item.desc}</Text>
            </View>
          ))}
        </View>
        
        <View style={[styles.quoteBox, { marginTop: 32, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}>
          <Text style={[styles.quoteText, { fontSize: 16 }]}>
            "Doanh nghiệp SME không chết vì quyết định sai —{'\n'}mà chết vì quyết định chậm."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerTextWhite}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumberWhite}>4</Text>
        </View>
      </Page>

      {/* ========== Page 5: Bluecore FDP là gì? ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>GIẢI PHÁP</Text>
        <Text style={styles.sectionTitle}>Bluecore FDP — Nền tảng Dữ liệu Tài chính</Text>
        <Text style={styles.sectionSubtitle}>
          Single Source of Truth cho mọi câu hỏi về tiền của doanh nghiệp. Thiết kế dành riêng cho CEO và CFO.
        </Text>
        
        {/* Feature strip */}
        <View style={styles.featureStrip}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon} />
            <Text style={styles.featureLabel}>Realtime Data</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon} />
            <Text style={styles.featureLabel}>Decision-First</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon} />
            <Text style={styles.featureLabel}>Unit Economics</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon} />
            <Text style={styles.featureLabel}>Cash Forecast</Text>
          </View>
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
        
        <View style={styles.impactBoxGradient}>
          <View>
            <Text style={styles.impactLabel}>Triển khai trong</Text>
            <Text style={styles.impactValueWhite}>Vài giờ</Text>
          </View>
          <Text style={styles.impactDesc}>Không cần IT, không cần training phức tạp. Thấy giá trị ngay lập tức.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>5</Text>
        </View>
      </Page>

      {/* ========== Page 6: So sánh với đối thủ ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>SO SÁNH</Text>
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
        
        <View style={[styles.quoteBox, { marginTop: 24 }]}>
          <Text style={[styles.quoteText, { fontSize: 11 }]}>
            Bluecore FDP không chỉ là công cụ báo cáo — mà là nền tảng hỗ trợ quyết định.{'\n'}
            Triển khai trong vài giờ, thấy giá trị ngay lập tức.
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>6</Text>
        </View>
      </Page>

      {/* ========== Page 7: Use Case 1 - Kiểm tra Cash (with AI Image) ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>USE CASE #1 — SÁNG THỨ HAI</Text>
        <Text style={styles.useCaseQuestion}>"Hôm nay mình có bao nhiêu tiền THẬT?"</Text>
        <Text style={styles.useCaseAnswer}>Bluecore trả lời trong 5 giây — mỗi sáng, CEO chỉ cần mở 1 màn hình.</Text>
        
        {/* AI Generated Mockup Image */}
        <View style={styles.mockupImageContainer}>
          <Image src={mockupImages.cashPosition} style={styles.mockupImageLarge} />
          <Text style={styles.mockupCaption}>Cash Position Dashboard — Giao diện thực tế của Bluecore FDP</Text>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>✓ Không cần chờ kế toán</Text>
            <Text style={styles.benefitText}>Data tự động cập nhật từ bank, sàn TMĐT, POS</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>✓ Phân biệt tiền thật vs sổ sách</Text>
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

      {/* ========== Page 8: Use Case 2 - SKU nào đang "ăn" tiền? (with AI Image) ========== */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>USE CASE #2 — UNIT ECONOMICS</Text>
        <Text style={styles.useCaseQuestion}>"Tại sao bán nhiều mà vẫn không có tiền?"</Text>
        <Text style={styles.useCaseAnswer}>Bluecore cho thấy Unit Economics từng SKU — phát hiện ngay SKU đang contribution margin âm.</Text>
        
        {/* AI Generated Mockup Image */}
        <View style={styles.mockupImageContainer}>
          <Image src={mockupImages.unitEconomics} style={styles.mockupImageLarge} />
          <Text style={styles.mockupCaption}>Unit Economics Dashboard — Xem P&L đến từng SKU</Text>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>✓ Không chỉ Gross Margin</Text>
            <Text style={styles.benefitText}>Tính đủ COGS, logistics, return, platform fees</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>✓ Action ngay lập tức</Text>
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

      {/* ========== Page 9: Use Case 3 - AR Collection (with AI Image) ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>USE CASE #3 — THU HỒI CÔNG NỢ</Text>
        <Text style={styles.useCaseQuestion}>"Ai đang nợ tiền mình?"</Text>
        <Text style={styles.useCaseAnswer}>Bluecore hiển thị AR Aging với Top 10 khách cần gọi ngay hôm nay.</Text>
        
        {/* AI Generated Mockup Image */}
        <View style={styles.mockupImageContainer}>
          <Image src={mockupImages.arAging} style={styles.mockupImageLarge} />
          <Text style={styles.mockupCaption}>AR Collection Priority — Danh sách khách cần thu hồi công nợ</Text>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>✓ Ưu tiên theo rủi ro</Text>
            <Text style={styles.benefitText}>Khách quá hạn lâu + số tiền lớn = gọi trước</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>✓ Tracking kết quả</Text>
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

      {/* ========== Page 10: Use Case 4 - Cash Runway Forecast (with AI Image) ========== */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>USE CASE #4 — DỰ BÁO RUNWAY</Text>
        <Text style={styles.useCaseQuestion}>"Còn bao lâu trước khi hết tiền?"</Text>
        <Text style={styles.useCaseAnswer}>Bluecore dự báo Cash Runway 30/60/90 ngày với các scenario khác nhau.</Text>
        
        {/* AI Generated Mockup Image */}
        <View style={styles.mockupImageContainer}>
          <Image src={mockupImages.runwayForecast} style={styles.mockupImageLarge} />
          <Text style={styles.mockupCaption}>Cash Runway Forecast — Dự báo dòng tiền theo nhiều kịch bản</Text>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>✓ 3 Scenarios</Text>
            <Text style={styles.benefitText}>Optimistic, Base, Pessimistic — thấy rõ mọi khả năng</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>✓ Alert trước khi quá muộn</Text>
            <Text style={styles.benefitText}>Cảnh báo tự động khi runway giảm dưới ngưỡng</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Biết trước</Text>
            <Text style={styles.impactValue}>2-3 tháng</Text>
          </View>
          <Text style={styles.impactDesc}>Nếu cash sắp cạn — đủ thời gian để hành động.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>10</Text>
        </View>
      </Page>

      {/* ========== Page 11: FDP Manifesto ========== */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>TRIẾT LÝ NỀN TẢNG</Text>
        <Text style={styles.sectionTitle}>FDP Manifesto — 10 Nguyên tắc bất biến</Text>
        <Text style={styles.sectionSubtitle}>
          Bluecore FDP được xây dựng trên 10 nguyên tắc không thể thỏa hiệp. Đây là kim chỉ nam cho mọi quyết định thiết kế sản phẩm.
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
        
        <Text style={styles.contactTitle}>Sẵn sàng kiểm soát{'\n'}dòng tiền?</Text>
        <Text style={styles.contactSubtitle}>
          Bắt đầu với Bluecore FDP ngay hôm nay.{'\n'}
          Triển khai trong vài giờ, thấy giá trị ngay lập tức.
        </Text>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactItem}>📧 contact@bluecore.vn</Text>
          <Text style={styles.contactItem}>🌐 www.bluecore.vn</Text>
          <Text style={styles.contactItem}>📱 0123 456 789</Text>
        </View>
        
        <View style={styles.contactCTA}>
          <Text style={styles.contactCTAText}>Đặt lịch Demo ngay</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerTextWhite}>© 2025 Bluecore</Text>
          <Text style={styles.pageNumberWhite}>12</Text>
        </View>
      </Page>
    </Document>
  );
};

export default FDPSalesDeckPDF;
