/**
 * Control Tower Sales Deck PDF Generator - v1.0
 * 
 * 12-slide narrative deck telling the Business Command Center Story for SME Retail
 * Tagline: "Awareness before Analytics"
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

// Brand colors - Amber/Orange theme for Control Tower
const colors = {
  primary: '#f59e0b',      // Amber
  primaryDark: '#b45309',  // Dark amber
  accent: '#10b981',       // Green
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  dangerLight: '#fef2f2',  // Red 50
  dangerBorder: '#fecaca', // Red 200
  text: '#1f2937',         // Gray 800
  textLight: '#6b7280',    // Gray 500
  background: '#f8fafc',   // Slate 50
  backgroundAlt: '#fffbeb', // Amber 50
  white: '#ffffff',
  black: '#000000',
  gradientStart: '#fffbeb', // Amber 50
  gradientEnd: '#fef3c7',   // Amber 100
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
    fontSize: 42,
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
    borderColor: '#fcd34d',
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
    borderColor: '#fcd34d',
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
    backgroundColor: colors.danger,
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

// Control Tower Day Timeline (Page 2)
const controlTowerDayTimeline = [
  { 
    time: '7:00 AM', 
    text: 'CEO check email, Slack, 3 dashboards khác nhau — không biết hôm nay cần làm gì quan trọng nhất.',
    danger: false,
  },
  { 
    time: '10:00 AM', 
    text: 'Vấn đề cash flow đã tồn tại 2 tuần, nhưng hôm nay mới được phát hiện trong meeting.',
    danger: true,
  },
  { 
    time: '1:00 PM', 
    text: 'Team A báo cáo ROAS tốt, Team B báo cáo cash thiếu. Ai đúng? Không ai biết.',
    danger: false,
  },
  { 
    time: '3:00 PM', 
    text: '5 alerts cùng lúc: inventory low, AR overdue, marketing overspend. Xử lý cái nào trước?',
    danger: true,
  },
  { 
    time: '6:00 PM', 
    text: 'Cuối tháng mới biết có vấn đề lớn — quá muộn để sửa.',
    danger: true,
  },
];

// 5 Control Tower Pain Points (Page 3)
const controlTowerPainPoints = [
  {
    number: '01',
    title: 'Quá nhiều dashboards, không có action',
    bullets: [
      '• 5 dashboards nhưng không ai biết làm gì',
      '• Charts đẹp, insights ít',
      '• Tốn 2 giờ/ngày xem số, không quyết định',
    ],
  },
  {
    number: '02',
    title: 'Phát hiện vấn đề quá muộn',
    bullets: [
      '• Cuối tháng mới biết tháng này lỗ',
      '• Cuối quý mới biết cash sắp cạn',
      '• Reactive thay vì proactive',
    ],
  },
  {
    number: '03',
    title: 'Alerts vô nghĩa, quá tải thông tin',
    bullets: [
      '• 50 alerts/ngày, không biết cái nào quan trọng',
      '• Không có priority, không có owner',
      '• Alert fatigue: bỏ qua tất cả',
    ],
  },
  {
    number: '04',
    title: 'Không có single source of truth',
    bullets: [
      '• Finance nói lãi, Marketing nói lỗ',
      '• Số khác nhau từ từng bộ phận',
      '• Mất thời gian "làm số" thay vì quyết định',
    ],
  },
  {
    number: '05',
    title: 'Không đo lường outcome quyết định',
    bullets: [
      '• Quyết định xong, không ai theo dõi',
      '• Không biết quyết định nào đúng/sai',
      '• Không học được từ quá khứ',
    ],
  },
];

// Cost of Control Chaos (Page 4)
const costItems = [
  {
    amount: '2-4 tuần',
    label: 'Delay phát hiện vấn đề',
    desc: 'Vấn đề đã tồn tại nhưng không ai biết để xử lý',
  },
  {
    amount: '50%',
    label: 'Thời gian họp "làm số"',
    desc: 'Thay vì quyết định, mọi người tranh cãi số nào đúng',
  },
  {
    amount: '???',
    label: 'Chi phí quyết định sai',
    desc: 'Không có feedback loop, không học từ sai lầm',
  },
];

// Three Pillars (Page 5)
const threePillars = [
  {
    icon: '!',
    title: 'ALERT',
    desc: 'Chỉ báo điều sai, không tổng hợp KPI',
  },
  {
    icon: '>',
    title: 'ACTION',
    desc: 'Mỗi alert có owner và deadline',
  },
  {
    icon: '#',
    title: 'OUTCOME',
    desc: 'Đo lường kết quả mọi quyết định',
  },
];

// Solution Cards (Page 5)
const solutionCards = [
  {
    badge: 'A',
    title: 'Command View',
    desc: 'Tối đa 5-7 alerts quan trọng nhất',
  },
  {
    badge: 'B',
    title: 'Decision Cards',
    desc: 'Alert có impact, owner, deadline',
  },
  {
    badge: 'C',
    title: 'Outcome Tracking',
    desc: 'Đo predicted vs actual impact',
  },
  {
    badge: 'D',
    title: 'Escalation Rules',
    desc: 'Auto-escalate nếu không xử lý',
  },
];

// Comparison table (Page 6)
const comparisonData = {
  headers: ['Tiêu chí', 'Dashboards', 'BI Tools', 'Task Apps', 'Control Tower'],
  rows: [
    ['Focus', 'Hiển thị tất cả', 'Charts đẹp', 'Tasks', 'Chỉ vấn đề sai'],
    ['Alert Quality', 'Nhiều, vô nghĩa', 'Không có', 'Không có', 'Ít, chí mạng'],
    ['Owner + Deadline', 'Không', 'Không', 'Có', 'Bắt buộc'],
    ['Outcome Tracking', 'Không', 'Không', 'Không', 'Có'],
    ['Decision-first', 'Không', 'Không', 'Không', 'Core principle'],
  ],
};

// Competitive Advantages (Page 6)
const competitiveAdvantages = [
  {
    number: '#1',
    title: 'CHỈ BÁO ĐIỀU SAI, KHÔNG TỔNG HỢP KPI',
    desc: 'Dashboard hiển thị mọi thứ. Control Tower chỉ hiển thị khi có vấn đề cần xử lý.',
  },
  {
    number: '#2',
    title: 'ALERT CÓ GIÁ, OWNER, DEADLINE',
    desc: 'Mỗi alert phải trả lời: mất bao nhiêu tiền? ai xử lý? còn bao lâu?',
  },
  {
    number: '#3',
    title: 'ĐO LƯỜNG OUTCOME MỌI QUYẾT ĐỊNH',
    desc: 'Feedback loop: quyết định → outcome → học. Không ai làm điều này.',
  },
];

// Story Blocks for Use Cases (Pages 7-10)
const useCaseStories = {
  criticalAlerts: {
    title: 'TINH HUONG THUC TE',
    text: 'CEO của một startup eCommerce nhận 50+ notifications mỗi ngày từ Slack, email, dashboards. Tháng trước bỏ lỡ 1 alert quan trọng về cash - gần hết tiền mà không biết.',
    result: 'VOI CONTROL TOWER: Mỗi sáng chỉ thấy 3-5 alerts chí mạng nhất. Cash alert được highlight với impact = 500 triệu. Không bao giờ bỏ lỡ.',
  },
  ownerDeadline: {
    title: 'TINH HUONG THUC TE',
    text: 'CFO phát hiện vấn đề AR overdue 800 triệu trong meeting. Giao cho Sales follow up. 2 tuần sau check lại - chưa ai làm gì. Không có owner, không có deadline.',
    result: 'VOI CONTROL TOWER: Alert có owner (Sales Lead), deadline (3 ngày), auto-escalate nếu không xử lý. CFO không cần nhắc.',
  },
  outcomeTracking: {
    title: 'TINH HUONG THUC TE',
    text: 'CMO quyết định cắt 3 campaigns dựa trên gut feeling. 1 tháng sau không ai biết quyết định đó đúng hay sai. Không có data để học.',
    result: 'VOI CONTROL TOWER: Outcome tracking cho thấy decision đã tiết kiệm 120 triệu/tháng. CMO biết quyết định đúng, tự tin hơn lần sau.',
  },
  cascadeEffect: {
    title: 'TINH HUONG THUC TE',
    text: 'CEO thấy revenue giảm 15% nhưng không hiểu nguyên nhân. Marketing đổ lỗi product, product đổ lỗi sales. Mất 3 tuần họp mới tìm ra root cause.',
    result: 'VOI CONTROL TOWER: Cascade view cho thấy: CDP churn -> MDP CAC tăng -> FDP cash giảm. Root cause rõ ràng trong 5 phút.',
  },
};

// Control Tower Manifesto condensed (Page 11)
const manifestoItems = [
  { number: '#1', title: 'Không phải Dashboard', desc: 'Không tổng hợp KPI. Chỉ báo động và hành động.' },
  { number: '#2', title: 'Chỉ quan tâm điều sai', desc: 'Nếu không có vấn đề, Control Tower im lặng.' },
  { number: '#3', title: 'Alert phải có giá', desc: 'Mất bao nhiêu tiền? Mất thêm bao nhiêu nếu không xử lý?' },
  { number: '#4', title: 'Ít nhưng chí mạng', desc: 'Tối đa 5-7 alerts. Nhiều hơn = vô nghĩa.' },
  { number: '#5', title: 'Owner + Outcome', desc: 'Mỗi alert có chủ sở hữu và kết quả.' },
  { number: '#6', title: 'Không real-time vô nghĩa', desc: 'Real-time chỉ khi giảm thiệt hại.' },
  { number: '#7', title: 'Gắn với FDP Truth', desc: 'Mọi alert dựa trên financial truth từ FDP.' },
  { number: '#8', title: 'Ép hành động', desc: 'Không đề xuất suông. Ai làm gì trong bao lâu.' },
  { number: '#9', title: 'Không bất ngờ', desc: 'Phát hiện sớm, báo trước khi quá muộn.' },
  { number: '#10', title: 'Final Test', desc: 'Nếu không xử lý việc sớm hơn = thất bại.' },
];

const ControlTowerSalesDeckPDF: React.FC = () => {
  return (
    <Document title="Bluecore Control Tower - Sales Deck" author="Bluecore">
      {/* ========== Page 1: Cover ========== */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        <View style={[styles.coverOrnament, styles.coverCircle3]} />
        <Text style={styles.coverTitle}>Bluecore{'\n'}Control Tower</Text>
        <Text style={styles.coverSubtitle}>
          Trung tâm Điều hành cho CEO & CFO{'\n'}
          Chỉ báo điều sai và ép hành động
        </Text>
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>COMMAND CENTER</Text>
        </View>
        <Text style={styles.coverTagline}>Awareness {'>'} Analytics</Text>
      </Page>

      {/* ========== Page 2: Câu chuyện Control Chaos ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>Câu chuyện</Text>
        <Text style={styles.sectionTitle}>5 dashboards nhưng vẫn không biết làm gì hôm nay</Text>
        <Text style={styles.sectionSubtitle}>
          Đây là câu chuyện xảy ra mỗi ngày tại hàng nghìn doanh nghiệp SME.
        </Text>
        
        <View style={styles.timelineContainer}>
          {controlTowerDayTimeline.map((item, index) => (
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
            "Càng nhiều dashboard, càng ít quyết định."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore Control Tower - Command Center</Text>
          <Text style={styles.pageNumber}>2</Text>
        </View>
      </Page>

      {/* ========== Page 3: 5 vấn đề Control ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabelRed}>Vấn đề</Text>
        <Text style={styles.sectionTitle}>5 lỗ hổng khiến CEO luôn reactive</Text>
        <Text style={styles.sectionSubtitle}>
          Những vấn đề "ẩn" mà dashboards và BI tools không giải quyết được.
        </Text>
        
        <View style={styles.painGrid}>
          {controlTowerPainPoints.map((item, index) => (
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
          <Text style={styles.footerText}>Bluecore Control Tower - Command Center</Text>
          <Text style={styles.pageNumber}>3</Text>
        </View>
      </Page>

      {/* ========== Page 4: Chi phí của "Control Chaos" ========== */}
      <Page size="A4" style={styles.pageDark}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        
        <Text style={{ fontSize: 10, fontWeight: 700, color: colors.warning, letterSpacing: 1, marginBottom: 8 }}>Hệ quả</Text>
        <Text style={styles.sectionTitleWhite}>Reactive = Chậm = Mất tiền thật</Text>
        <Text style={{ fontSize: 12, fontWeight: 400, color: colors.white, opacity: 0.8, marginBottom: 28, lineHeight: 1.5 }}>
          Đây không phải lý thuyết — đây là chi phí thực của việc không có Control Tower.
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
            "Doanh nghiệp không được chết vì bất ngờ."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerTextWhite}>Bluecore Control Tower - Command Center</Text>
          <Text style={styles.pageNumberWhite}>4</Text>
        </View>
      </Page>

      {/* ========== Page 5: Control Tower là gì? ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>Định vị</Text>
        <Text style={styles.sectionTitle}>Control Tower không phải Dashboard — không phải BI</Text>
        
        <View style={styles.positioningStatement}>
          <Text style={styles.positioningText}>
            Control Tower tồn tại để báo động và hành động. Không tổng hợp KPI, không hiển thị charts đẹp. Chỉ cho CEO/CFO biết: điều gì đang sai và cần xử lý ngay?
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
            <Text style={styles.impactLabel}>Phát hiện sớm</Text>
            <Text style={styles.impactValue}>2-4 tuần</Text>
          </View>
          <Text style={styles.impactDesc}>Trước khi vấn đề thể hiện trong báo cáo tài chính cuối tháng.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore Control Tower - Command Center</Text>
          <Text style={styles.pageNumber}>5</Text>
        </View>
      </Page>

      {/* ========== Page 6: So sánh + Competitive Advantages ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>So sánh</Text>
        <Text style={styles.sectionTitle}>Tại sao chọn Control Tower?</Text>
        <Text style={styles.sectionSubtitle}>
          So sánh với các công cụ dashboards và BI phổ biến.
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
          <Text style={styles.advantagesSectionTitle}>TẠI SAO CONTROL TOWER KHÁC BIỆT?</Text>
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
            "Control Tower không cạnh tranh với dashboards — chúng tôi ép hành động thay vì hiển thị."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore Control Tower - Command Center</Text>
          <Text style={styles.pageNumber}>6</Text>
        </View>
      </Page>

      {/* ========== Page 7: Use Case 1 - Critical Alerts ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #1</Text>
        <Text style={styles.useCaseQuestion}>"Hôm nay cần xử lý gì quan trọng nhất?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.criticalAlerts.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.criticalAlerts.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.criticalAlerts.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Command View</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>3 CRITICAL</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>[!] Cash Critical</Text>
              <Text style={styles.mockupKPIValueRed}>500 Tr</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>[!] AR Overdue</Text>
              <Text style={styles.mockupKPIValue}>320 Tr</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>[!] Marketing</Text>
              <Text style={styles.mockupKPIValue}>-80 Tr</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Không bị overload</Text>
            <Text style={styles.benefitText}>Tối đa 5-7 alerts. Chỉ điều quan trọng nhất.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Impact rõ ràng</Text>
            <Text style={styles.benefitText}>Mỗi alert có số tiền impact, không chỉ status.</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Không bỏ lỡ</Text>
            <Text style={styles.impactValue}>100%</Text>
          </View>
          <Text style={styles.impactDesc}>Critical alerts. Ít hơn = focus hơn = không bỏ lỡ.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore Control Tower - Command Center</Text>
          <Text style={styles.pageNumber}>7</Text>
        </View>
      </Page>

      {/* ========== Page 8: Use Case 2 - Owner + Deadline ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #2</Text>
        <Text style={styles.useCaseQuestion}>"Ai xử lý? Khi nào xong?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.ownerDeadline.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.ownerDeadline.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.ownerDeadline.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Decision Card</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>ASSIGNED</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>Impact</Text>
              <Text style={styles.mockupKPIValueRed}>800 Tr</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Owner</Text>
              <Text style={styles.mockupKPIValue}>Sales Lead</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Deadline</Text>
              <Text style={styles.mockupKPIValue}>3 ngày</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Accountability rõ ràng</Text>
            <Text style={styles.benefitText}>Mỗi alert có owner. Không thể đổ lỗi.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Auto-escalate</Text>
            <Text style={styles.benefitText}>Không xử lý đúng hạn = tự động báo cấp trên.</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Không cần nhắc</Text>
            <Text style={styles.impactValue}>0 lần</Text>
          </View>
          <Text style={styles.impactDesc}>CEO không cần follow up. System làm việc đó.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore Control Tower - Command Center</Text>
          <Text style={styles.pageNumber}>8</Text>
        </View>
      </Page>

      {/* ========== Page 9: Use Case 3 - Outcome Tracking ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #3</Text>
        <Text style={styles.useCaseQuestion}>"Quyết định đó đúng hay sai?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.outcomeTracking.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.outcomeTracking.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.outcomeTracking.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Outcome Tracking</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>RESOLVED</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Predicted Impact</Text>
              <Text style={styles.mockupKPIValue}>100 Tr</Text>
            </View>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>Actual Impact</Text>
              <Text style={styles.mockupKPIValueGreen}>120 Tr</Text>
            </View>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>Accuracy</Text>
              <Text style={styles.mockupKPIValueGreen}>83%</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Feedback loop</Text>
            <Text style={styles.benefitText}>Predicted vs Actual. Biết quyết định nào đúng.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Học từ quá khứ</Text>
            <Text style={styles.benefitText}>Data để improve quyết định tương lai.</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Decision accuracy</Text>
            <Text style={styles.impactValue}>+25%</Text>
          </View>
          <Text style={styles.impactDesc}>Theo thời gian nhờ feedback loop.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore Control Tower - Command Center</Text>
          <Text style={styles.pageNumber}>9</Text>
        </View>
      </Page>

      {/* ========== Page 10: Use Case 4 - Cascade Effect ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>Use Case #4</Text>
        <Text style={styles.useCaseQuestion}>"Root cause là gì?"</Text>
        
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.cascadeEffect.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.cascadeEffect.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.cascadeEffect.result}</Text>
        </View>
        
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Cascade View</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>ANALYSIS</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>CDP: Churn</Text>
              <Text style={styles.mockupKPIValueRed}>+15%</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>→ MDP: CAC</Text>
              <Text style={styles.mockupKPIValue}>+30%</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>→ FDP: Cash</Text>
              <Text style={styles.mockupKPIValue}>-20%</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Thấy root cause</Text>
            <Text style={styles.benefitText}>Không chỉ symptom mà còn nguyên nhân gốc.</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Cross-module visibility</Text>
            <Text style={styles.benefitText}>Vấn đề ở CDP ảnh hưởng FDP thế nào.</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Tìm root cause</Text>
            <Text style={styles.impactValue}>5 phút</Text>
          </View>
          <Text style={styles.impactDesc}>Thay vì 3 tuần họp để tranh cãi.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore Control Tower - Command Center</Text>
          <Text style={styles.pageNumber}>10</Text>
        </View>
      </Page>

      {/* ========== Page 11: Control Tower Manifesto ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>Manifesto</Text>
        <Text style={styles.sectionTitle}>10 Nguyên tắc của Control Tower</Text>
        <Text style={styles.sectionSubtitle}>
          Những nguyên tắc bất biến định hình cách Control Tower hoạt động.
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
          <Text style={styles.footerText}>Bluecore Control Tower - Command Center</Text>
          <Text style={styles.pageNumber}>11</Text>
        </View>
      </Page>

      {/* ========== Page 12: CTA ========== */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        
        <Text style={styles.contactTitle}>Sẵn sàng không còn{'\n'}bất ngờ?</Text>
        <Text style={styles.contactSubtitle}>
          Kết nối FDP data và thấy critical alerts ngay trong 24 giờ.
        </Text>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactItem}>Email: contact@bluecore.vn</Text>
          <Text style={styles.contactItem}>Web: bluecore.vn</Text>
        </View>
        
        <View style={styles.contactCTA}>
          <Text style={styles.contactCTAText}>Đặt lịch Demo</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerTextWhite}>Bluecore Control Tower - Command Center</Text>
          <Text style={styles.pageNumberWhite}>12</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ControlTowerSalesDeckPDF;
