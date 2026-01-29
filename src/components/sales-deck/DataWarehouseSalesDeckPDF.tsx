/**
 * Data Warehouse Sales Deck PDF Component - v2.0
 * 
 * Professional PDF sales deck for the Data Warehouse module
 * Following the 'Single Source of Truth' philosophy
 * 
 * 12-page narrative with WOW factor:
 * - 35+ Connectors ecosystem
 * - Competitive comparison table
 * - Vietnamese retail-specific context
 * 
 * Vietnamese content with full diacritics (tiếng Việt có dấu đầy đủ)
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

// Helper to get base URL for fonts
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// Register Noto Sans font with Vietnamese support
Font.register({
  family: 'NotoSans',
  fonts: [
    {
      src: `${getBaseUrl()}/fonts/NotoSans-Regular.ttf`,
      fontWeight: 400,
    },
    {
      src: `${getBaseUrl()}/fonts/NotoSans-Bold.ttf`,
      fontWeight: 700,
    },
  ],
});

// Color palette
const colors = {
  primary: '#1e40af',
  primaryLight: '#3b82f6',
  secondary: '#475569',
  accent: '#0891b2',
  accentLight: '#22d3d8',
  background: '#ffffff',
  backgroundAlt: '#f8fafc',
  backgroundDark: '#0f172a',
  gradientStart: '#0f172a',
  gradientMid: '#1e3a5f',
  text: '#1e293b',
  textLight: '#64748b',
  textWhite: '#ffffff',
  success: '#10b981',
  successLight: '#ecfdf5',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  error: '#ef4444',
  errorLight: '#fef2f2',
  border: '#e2e8f0',
  gold: '#eab308',
};

// Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: colors.background,
    fontFamily: 'NotoSans',
    padding: 0,
  },
  pageDark: {
    flexDirection: 'column',
    backgroundColor: colors.backgroundDark,
    fontFamily: 'NotoSans',
    padding: 0,
  },
  pageAlt: {
    flexDirection: 'column',
    backgroundColor: colors.backgroundAlt,
    fontFamily: 'NotoSans',
    padding: 0,
  },
  container: {
    padding: 40,
    flex: 1,
  },
  // Cover styles
  coverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
    position: 'relative',
  },
  coverBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  coverBadgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
  },
  coverTitle: {
    fontSize: 48,
    fontWeight: 700,
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 18,
    color: colors.accentLight,
    textAlign: 'center',
    marginBottom: 30,
  },
  coverTagline: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.textWhite,
    textAlign: 'center',
    borderTopWidth: 2,
    borderTopColor: colors.accent,
    paddingTop: 20,
    marginTop: 20,
  },
  coverStats: {
    flexDirection: 'row',
    gap: 30,
    marginTop: 40,
  },
  coverStatItem: {
    alignItems: 'center',
  },
  coverStatNumber: {
    fontSize: 36,
    fontWeight: 700,
    color: colors.accentLight,
  },
  coverStatLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 4,
  },
  // Section styles
  sectionTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitleWhite: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.textWhite,
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitleLeft: {
    fontSize: 26,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 450,
    alignSelf: 'center',
    lineHeight: 1.5,
  },
  sectionSubtitleWhite: {
    fontSize: 12,
    color: colors.accentLight,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 450,
    alignSelf: 'center',
    lineHeight: 1.5,
  },
  // Card styles
  card: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHighlight: {
    backgroundColor: colors.successLight,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.success,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 6,
  },
  cardTitleWhite: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.textWhite,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 10,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  cardTextWhite: {
    fontSize: 10,
    color: colors.accentLight,
    lineHeight: 1.5,
  },
  // Grid styles
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col2: {
    flex: 1,
    width: '48%',
  },
  col3: {
    flex: 1,
    width: '31%',
  },
  // Connector grid
  connectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  connectorCategory: {
    marginBottom: 16,
  },
  connectorCategoryTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.accent,
    marginBottom: 8,
    letterSpacing: 1,
  },
  connectorPill: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  connectorPillDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  connectorPillText: {
    fontSize: 8,
    color: colors.text,
    fontWeight: 700,
  },
  connectorPillTextWhite: {
    fontSize: 8,
    color: colors.textWhite,
    fontWeight: 700,
  },
  // Comparison table
  compTable: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  compHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundDark,
  },
  compRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  compCell: {
    flex: 1,
    padding: 8,
    fontSize: 8,
    color: colors.text,
    textAlign: 'center',
  },
  compCellFirst: {
    flex: 1.2,
    padding: 8,
    fontSize: 8,
    fontWeight: 700,
    color: colors.text,
    textAlign: 'left',
  },
  compHeaderCell: {
    flex: 1,
    padding: 8,
    fontSize: 8,
    fontWeight: 700,
    color: colors.textWhite,
    textAlign: 'center',
  },
  compHeaderCellFirst: {
    flex: 1.2,
    padding: 8,
    fontSize: 8,
    fontWeight: 700,
    color: colors.textWhite,
    textAlign: 'left',
  },
  compCellHighlight: {
    flex: 1,
    padding: 8,
    fontSize: 8,
    fontWeight: 700,
    color: colors.success,
    textAlign: 'center',
    backgroundColor: colors.successLight,
  },
  compCellBad: {
    flex: 1,
    padding: 8,
    fontSize: 8,
    color: colors.error,
    textAlign: 'center',
    backgroundColor: colors.errorLight,
  },
  // Quote styles
  quoteBox: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: 20,
    marginTop: 16,
  },
  quoteText: {
    fontSize: 13,
    color: colors.textWhite,
    textAlign: 'center',
    fontWeight: 700,
    lineHeight: 1.5,
  },
  // Story block
  storyBlock: {
    backgroundColor: 'rgba(8, 145, 178, 0.1)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  storyBlockDark: {
    backgroundColor: 'rgba(34, 211, 216, 0.1)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentLight,
  },
  storyTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.accent,
    marginBottom: 6,
  },
  storyTitleWhite: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.accentLight,
    marginBottom: 6,
  },
  storyText: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.5,
  },
  storyTextWhite: {
    fontSize: 10,
    color: colors.textWhite,
    lineHeight: 1.5,
  },
  // Manifesto styles
  manifestoItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  manifestoNumber: {
    width: 22,
    height: 22,
    backgroundColor: colors.accent,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  manifestoNumberText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: 700,
  },
  manifestoText: {
    flex: 1,
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.4,
  },
  manifestoTextWhite: {
    flex: 1,
    fontSize: 10,
    color: colors.textWhite,
    lineHeight: 1.4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: colors.textLight,
  },
  footerTextWhite: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
  },
  pageNumber: {
    fontSize: 9,
    color: colors.textLight,
  },
  pageNumberWhite: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
  },
  // Decorative elements
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
  },
  // Big number
  bigNumber: {
    fontSize: 64,
    fontWeight: 700,
    color: colors.accentLight,
    textAlign: 'center',
  },
  bigNumberLabel: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  // Pain point
  painCard: {
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  painTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.error,
    marginBottom: 4,
  },
  painText: {
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.4,
  },
  // Mockup styles
  mockupContainer: {
    backgroundColor: colors.backgroundDark,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  mockupHeader: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  mockupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mockupContent: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    padding: 12,
  },
  mockupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  mockupLabel: {
    fontSize: 9,
    color: colors.textLight,
  },
  mockupValue: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.accentLight,
  },
});

// =====================================================
// CONTENT DATA - Vietnamese with full diacritics
// =====================================================

// 35+ Connectors from bluecore.vn
const connectorCategories = [
  {
    category: 'E-COMMERCE',
    items: ['Shopee', 'Lazada', 'Tiki', 'TikTok Shop', 'Shopify'],
  },
  {
    category: 'POS & QUẢN LÝ BÁN HÀNG',
    items: ['Haravan', 'Sapo', 'KiotViet', 'Nhanh.vn', 'MISA CukCuk'],
  },
  {
    category: 'QUẢNG CÁO & MARKETING',
    items: ['Facebook Ads', 'TikTok Ads', 'Google Ads', 'LinkedIn Ads', 'Meta Graph'],
  },
  {
    category: 'PHÂN TÍCH & TRACKING',
    items: ['Google Analytics', 'Youtube Analytics', 'Pancake'],
  },
  {
    category: 'THÔNG BÁO & EMAIL',
    items: ['Gmail', 'Zalo ZNS', 'Zalo OA', 'eSMS', 'VMG SMS', 'Vietguys', 'Mailchimp', 'Brevo'],
  },
  {
    category: 'CƠ SỞ DỮ LIỆU & FILE',
    items: ['MySQL', 'Google Sheets', 'Excel Files', 'CSV', 'Base.vn', 'Microsoft Account'],
  },
];

const totalConnectors = connectorCategories.reduce((sum, cat) => sum + cat.items.length, 0);

// Competitive comparison data
const comparisonData = {
  headers: ['Tiêu chí', 'Excel/Sheets', 'Power BI', 'Giải pháp tự xây', 'Bluecore DW'],
  rows: [
    {
      criteria: 'Thời gian triển khai',
      excel: '1-2 tuần',
      powerbi: '2-4 tuần',
      custom: '3-6 tháng',
      bluecore: '1-2 tuần',
      highlight: 'bluecore',
    },
    {
      criteria: 'Kết nối sàn TMĐT VN',
      excel: 'Thủ công',
      powerbi: 'Không có',
      custom: 'Phải code',
      bluecore: '35+ sẵn có',
      highlight: 'bluecore',
    },
    {
      criteria: 'Realtime Data',
      excel: 'Không',
      powerbi: 'Giới hạn',
      custom: 'Có thể',
      bluecore: 'Có',
      highlight: 'bluecore',
    },
    {
      criteria: 'Bảo trì connector',
      excel: 'N/A',
      powerbi: 'Không có',
      custom: 'Tự bảo trì',
      bluecore: 'Bluecore lo',
      highlight: 'bluecore',
    },
    {
      criteria: 'Hỗ trợ tiếng Việt',
      excel: 'Có',
      powerbi: 'Giới hạn',
      custom: 'Tuỳ',
      bluecore: 'Native',
      highlight: 'bluecore',
    },
    {
      criteria: 'Chi phí/tháng',
      excel: 'Thấp',
      powerbi: 'Trung bình',
      custom: 'Rất cao',
      bluecore: 'Hợp lý',
      highlight: 'bluecore',
    },
  ],
};

// Pain points
const painPoints = [
  {
    title: 'Dữ liệu nằm rải rác',
    desc: 'Shopee 1 file, Lazada 1 file, TikTok Shop 1 file, KiotViet 1 file... Mỗi sáng phải mở 10 tab để xem số.',
  },
  {
    title: 'Copy-paste thủ công',
    desc: 'Mỗi ngày dành 2-3 giờ copy số từ các platform vào Excel. Sai số là chuyện thường.',
  },
  {
    title: 'Số liệu không khớp',
    desc: 'Báo cáo Marketing khác số Kế toán. Shopee report khác số thực nhận. Không ai biết đâu là sự thật.',
  },
  {
    title: 'Không thể so sánh',
    desc: 'Muốn biết kênh nào hiệu quả nhất nhưng data định dạng khác nhau, không thể gộp được.',
  },
];

// Use cases - Vietnamese retail specific
const useCases = [
  {
    title: 'Tổng hợp doanh thu đa kênh',
    persona: 'E-commerce Manager',
    situation: 'Bán hàng trên 5 sàn + website + cửa hàng offline. Mỗi kênh một dashboard riêng.',
    problem: 'Cuối ngày mất 2 giờ để tổng hợp số, cuối tháng mất 2 ngày để đối soát.',
    solution: 'Bluecore tự động kéo data từ tất cả kênh, chuẩn hoá và gộp vào một dashboard duy nhất.',
    result: 'Xem tổng doanh thu realtime. Biết ngay kênh nào đang bán chạy, kênh nào cần push.',
    metrics: [
      { label: 'Thời gian tổng hợp', before: '2 giờ/ngày', after: '0 phút' },
      { label: 'Độ chính xác', before: '85%', after: '99.9%' },
    ],
  },
  {
    title: 'Đo ROI Marketing thực',
    persona: 'Marketing Director',
    situation: 'Chạy ads trên Facebook, TikTok, Google. Mỗi platform báo ROI khác nhau.',
    problem: 'Facebook nói ROAS 5x nhưng doanh thu thực chỉ 2x. Không biết đâu là số thật.',
    solution: 'Bluecore kết nối chi phí ads với doanh thu thực từ sàn, tính ROI based on settled revenue.',
    result: 'Biết chính xác 1 đồng ads mang về bao nhiêu tiền thật. Cắt channel lỗ ngay lập tức.',
    metrics: [
      { label: 'Chi phí ads lãng phí', before: '30%', after: '< 5%' },
      { label: 'Thời gian ra quyết định', before: '2-3 ngày', after: 'Realtime' },
    ],
  },
  {
    title: 'Đối soát tồn kho',
    persona: 'Operations Manager',
    situation: 'Hàng nằm ở 3 kho + các sàn. Mỗi nơi một hệ thống quản lý riêng.',
    problem: 'Không biết thực sự còn bao nhiêu hàng. Đặt thêm hàng rồi mới biết đã oversupply.',
    solution: 'Bluecore sync inventory từ tất cả nguồn, cảnh báo khi stock thấp hoặc quá cao.',
    result: 'Một màn hình xem toàn bộ tồn kho. Tự động cảnh báo reorder point.',
    metrics: [
      { label: 'Độ chính xác tồn kho', before: '70%', after: '98%' },
      { label: 'Dead stock', before: '15%', after: '3%' },
    ],
  },
  {
    title: 'Báo cáo tự động CEO',
    persona: 'CEO / CFO',
    situation: 'Mỗi tuần họp cần số liệu từ 5 phòng ban. Mỗi phòng gửi format khác nhau.',
    problem: 'Dành 1 ngày để gộp số, format lại. Số liệu đã outdated khi họp.',
    solution: 'Bluecore tạo dashboard realtime, tự động gửi report theo lịch đã định.',
    result: 'Mở app là có số. Report tự động gửi email mỗi sáng thứ Hai.',
    metrics: [
      { label: 'Thời gian làm báo cáo', before: '1 ngày/tuần', after: '0 phút' },
      { label: 'Độ fresh của data', before: '3-5 ngày', after: 'Realtime' },
    ],
  },
];

// Data Warehouse Manifesto
const manifestoItems = [
  'SINGLE SOURCE OF TRUTH - Chỉ có một phiên bản dữ liệu duy nhất, không tranh cãi số liệu',
  'KẾT NỐI SẴN CÓ - 35+ connectors cho thị trường Việt Nam, không cần code',
  'REALTIME SYNC - Dữ liệu cập nhật liên tục, không phải chờ export thủ công',
  'CHUẨN HOÁ TỰ ĐỘNG - Dữ liệu từ mọi nguồn được transform về format thống nhất',
  'PHÂN QUYỀN RÕ RÀNG - Ai được xem gì, sửa gì đều được kiểm soát chặt chẽ',
  'BẢO TRÌ BỞI BLUECORE - Khi sàn thay đổi API, Bluecore cập nhật connector, bạn không cần lo',
  'TÍCH HỢP BI - Kết nối trực tiếp với các công cụ visualize như Data Studio, Metabase',
  'AUDIT TRAIL - Mọi thay đổi dữ liệu đều được ghi log, trace được nguồn gốc',
  'SCALE KHÔNG GIỚI HẠN - Từ SME đến Enterprise, hệ thống grow cùng doanh nghiệp',
  'SUPPORT TIẾNG VIỆT - Đội ngũ hỗ trợ người Việt, hiểu context retail Việt Nam',
];

// =====================================================
// PAGE COMPONENTS
// =====================================================

const CoverPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={[styles.decorCircle, { width: 400, height: 400, top: -150, right: -150, backgroundColor: colors.accent }]} />
    <View style={[styles.decorCircle, { width: 300, height: 300, bottom: -100, left: -100, backgroundColor: colors.accentLight }]} />
    
    <View style={styles.coverContainer}>
      <View style={styles.coverBadge}>
        <Text style={styles.coverBadgeText}>BLUECORE DATA PLATFORM</Text>
      </View>
      <Text style={styles.coverTitle}>Data Warehouse</Text>
      <Text style={styles.coverSubtitle}>Kho dữ liệu hợp nhất cho doanh nghiệp Việt Nam</Text>
      
      <View style={styles.coverStats}>
        <View style={styles.coverStatItem}>
          <Text style={styles.coverStatNumber}>35+</Text>
          <Text style={styles.coverStatLabel}>Connectors sẵn có</Text>
        </View>
        <View style={styles.coverStatItem}>
          <Text style={styles.coverStatNumber}>100%</Text>
          <Text style={styles.coverStatLabel}>Thị trường VN</Text>
        </View>
        <View style={styles.coverStatItem}>
          <Text style={styles.coverStatNumber}>0</Text>
          <Text style={styles.coverStatLabel}>Dòng code cần viết</Text>
        </View>
      </View>
      
      <Text style={styles.coverTagline}>Single Source of Truth</Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>bluecore.vn</Text>
      <Text style={styles.pageNumberWhite}>01</Text>
    </View>
  </Page>
);

const PainPointsPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.error }]}>Bạn đang gặp vấn đề này?</Text>
      <Text style={styles.sectionSubtitle}>
        90% doanh nghiệp bán hàng đa kênh tại Việt Nam đang chịu đựng những nỗi đau này mỗi ngày
      </Text>
      
      <View style={styles.row}>
        <View style={styles.col2}>
          {painPoints.slice(0, 2).map((pain, idx) => (
            <View key={idx} style={styles.painCard}>
              <Text style={styles.painTitle}>[!] {pain.title}</Text>
              <Text style={styles.painText}>{pain.desc}</Text>
            </View>
          ))}
        </View>
        <View style={styles.col2}>
          {painPoints.slice(2, 4).map((pain, idx) => (
            <View key={idx} style={styles.painCard}>
              <Text style={styles.painTitle}>[!] {pain.title}</Text>
              <Text style={styles.painText}>{pain.desc}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={[styles.quoteBox, { backgroundColor: colors.error, marginTop: 20 }]}>
        <Text style={styles.quoteText}>
          Chi phí ẩn của việc không có Data Warehouse:{'\n'}
          2-3 giờ mỗi ngày x 22 ngày = 44-66 giờ lãng phí mỗi tháng
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>02</Text>
    </View>
  </Page>
);

const ConnectorsPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleWhite}>35+ Connectors Sẵn Có</Text>
      <Text style={styles.sectionSubtitleWhite}>
        Không cần code. Không cần đợi. Kết nối ngay với toàn bộ hệ sinh thái retail Việt Nam.
      </Text>
      
      {connectorCategories.map((category, idx) => (
        <View key={idx} style={styles.connectorCategory}>
          <Text style={styles.connectorCategoryTitle}>{category.category}</Text>
          <View style={styles.connectorGrid}>
            {category.items.map((item, itemIdx) => (
              <View key={itemIdx} style={styles.connectorPillDark}>
                <Text style={styles.connectorPillTextWhite}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      
      <View style={[styles.quoteBox, { marginTop: 16 }]}>
        <Text style={styles.quoteText}>
          Khi sàn thay đổi API, Bluecore cập nhật connector. Bạn không cần làm gì.
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>03</Text>
    </View>
  </Page>
);

const ComparisonPage = () => (
  <Page size="A4" style={styles.page}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>So sánh với các giải pháp khác</Text>
      <Text style={styles.sectionSubtitle}>
        Bluecore Data Warehouse được thiết kế riêng cho doanh nghiệp Việt Nam
      </Text>
      
      <View style={styles.compTable}>
        <View style={styles.compHeaderRow}>
          <Text style={styles.compHeaderCellFirst}>Tiêu chí</Text>
          <Text style={styles.compHeaderCell}>Excel/Sheets</Text>
          <Text style={styles.compHeaderCell}>Power BI</Text>
          <Text style={styles.compHeaderCell}>Tự xây</Text>
          <Text style={[styles.compHeaderCell, { backgroundColor: colors.accent }]}>Bluecore</Text>
        </View>
        
        {comparisonData.rows.map((row, idx) => (
          <View key={idx} style={idx % 2 === 0 ? styles.compRow : styles.compRowAlt}>
            <Text style={styles.compCellFirst}>{row.criteria}</Text>
            <Text style={row.highlight === 'excel' ? styles.compCellHighlight : styles.compCellBad}>{row.excel}</Text>
            <Text style={row.highlight === 'powerbi' ? styles.compCellHighlight : styles.compCellBad}>{row.powerbi}</Text>
            <Text style={row.highlight === 'custom' ? styles.compCellHighlight : styles.compCellBad}>{row.custom}</Text>
            <Text style={styles.compCellHighlight}>{row.bluecore}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.row}>
        <View style={[styles.cardHighlight, { flex: 1, marginTop: 20 }]}>
          <Text style={[styles.cardTitle, { color: colors.success, textAlign: 'center' }]}>
            Tại sao chọn Bluecore?
          </Text>
          <Text style={[styles.cardText, { textAlign: 'center', marginTop: 8 }]}>
            Connectors cho thị trường Việt Nam (Shopee, Lazada, TikTok Shop, Haravan, KiotViet...){'\n'}
            Không cần thuê developer. Triển khai trong 1-2 tuần. Hỗ trợ tiếng Việt 24/7.
          </Text>
        </View>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>04</Text>
    </View>
  </Page>
);

const UseCasePage1 = () => (
  <Page size="A4" style={styles.page}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleLeft}>{useCases[0].title}</Text>
      
      <View style={styles.storyBlock}>
        <Text style={styles.storyTitle}>TÌNH HUỐNG - {useCases[0].persona}</Text>
        <Text style={styles.storyText}>{useCases[0].situation}</Text>
      </View>
      
      <View style={styles.painCard}>
        <Text style={styles.painTitle}>VẤN ĐỀ</Text>
        <Text style={styles.painText}>{useCases[0].problem}</Text>
      </View>
      
      <View style={styles.cardHighlight}>
        <Text style={[styles.cardTitle, { color: colors.success }]}>GIẢI PHÁP BLUECORE</Text>
        <Text style={styles.cardText}>{useCases[0].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: colors.error }]} />
          <View style={[styles.mockupDot, { backgroundColor: colors.warning }]} />
          <View style={[styles.mockupDot, { backgroundColor: colors.success }]} />
        </View>
        <View style={styles.mockupContent}>
          {useCases[0].metrics.map((metric, idx) => (
            <View key={idx} style={[styles.mockupRow, idx === useCases[0].metrics.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.mockupLabel}>{metric.label}</Text>
              <Text style={[styles.mockupValue, { color: colors.error }]}>{metric.before}</Text>
              <Text style={styles.mockupValue}>[--]</Text>
              <Text style={[styles.mockupValue, { color: colors.success }]}>{metric.after}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>KẾT QUẢ: {useCases[0].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>05</Text>
    </View>
  </Page>
);

const UseCasePage2 = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleWhite}>{useCases[1].title}</Text>
      
      <View style={styles.storyBlockDark}>
        <Text style={styles.storyTitleWhite}>TÌNH HUỐNG - {useCases[1].persona}</Text>
        <Text style={styles.storyTextWhite}>{useCases[1].situation}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.error }]}>VẤN ĐỀ</Text>
        <Text style={styles.cardTextWhite}>{useCases[1].problem}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.success }]}>GIẢI PHÁP BLUECORE</Text>
        <Text style={styles.cardTextWhite}>{useCases[1].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: colors.error }]} />
          <View style={[styles.mockupDot, { backgroundColor: colors.warning }]} />
          <View style={[styles.mockupDot, { backgroundColor: colors.success }]} />
        </View>
        <View style={styles.mockupContent}>
          {useCases[1].metrics.map((metric, idx) => (
            <View key={idx} style={[styles.mockupRow, idx === useCases[1].metrics.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.mockupLabel}>{metric.label}</Text>
              <Text style={[styles.mockupValue, { color: colors.error }]}>{metric.before}</Text>
              <Text style={styles.mockupValue}>[--]</Text>
              <Text style={[styles.mockupValue, { color: colors.success }]}>{metric.after}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>KẾT QUẢ: {useCases[1].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>06</Text>
    </View>
  </Page>
);

const UseCasePage3 = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleLeft}>{useCases[2].title}</Text>
      
      <View style={styles.storyBlock}>
        <Text style={styles.storyTitle}>TÌNH HUỐNG - {useCases[2].persona}</Text>
        <Text style={styles.storyText}>{useCases[2].situation}</Text>
      </View>
      
      <View style={styles.painCard}>
        <Text style={styles.painTitle}>VẤN ĐỀ</Text>
        <Text style={styles.painText}>{useCases[2].problem}</Text>
      </View>
      
      <View style={styles.cardHighlight}>
        <Text style={[styles.cardTitle, { color: colors.success }]}>GIẢI PHÁP BLUECORE</Text>
        <Text style={styles.cardText}>{useCases[2].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: colors.error }]} />
          <View style={[styles.mockupDot, { backgroundColor: colors.warning }]} />
          <View style={[styles.mockupDot, { backgroundColor: colors.success }]} />
        </View>
        <View style={styles.mockupContent}>
          {useCases[2].metrics.map((metric, idx) => (
            <View key={idx} style={[styles.mockupRow, idx === useCases[2].metrics.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.mockupLabel}>{metric.label}</Text>
              <Text style={[styles.mockupValue, { color: colors.error }]}>{metric.before}</Text>
              <Text style={styles.mockupValue}>[--]</Text>
              <Text style={[styles.mockupValue, { color: colors.success }]}>{metric.after}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={[styles.quoteBox, { backgroundColor: colors.success }]}>
        <Text style={styles.quoteText}>KẾT QUẢ: {useCases[2].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>07</Text>
    </View>
  </Page>
);

const UseCasePage4 = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleWhite}>{useCases[3].title}</Text>
      
      <View style={styles.storyBlockDark}>
        <Text style={styles.storyTitleWhite}>TÌNH HUỐNG - {useCases[3].persona}</Text>
        <Text style={styles.storyTextWhite}>{useCases[3].situation}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.error }]}>VẤN ĐỀ</Text>
        <Text style={styles.cardTextWhite}>{useCases[3].problem}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.success }]}>GIẢI PHÁP BLUECORE</Text>
        <Text style={styles.cardTextWhite}>{useCases[3].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: colors.error }]} />
          <View style={[styles.mockupDot, { backgroundColor: colors.warning }]} />
          <View style={[styles.mockupDot, { backgroundColor: colors.success }]} />
        </View>
        <View style={styles.mockupContent}>
          {useCases[3].metrics.map((metric, idx) => (
            <View key={idx} style={[styles.mockupRow, idx === useCases[3].metrics.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.mockupLabel}>{metric.label}</Text>
              <Text style={[styles.mockupValue, { color: colors.error }]}>{metric.before}</Text>
              <Text style={styles.mockupValue}>[--]</Text>
              <Text style={[styles.mockupValue, { color: colors.success }]}>{metric.after}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>KẾT QUẢ: {useCases[3].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>08</Text>
    </View>
  </Page>
);

const ArchitecturePage = () => (
  <Page size="A4" style={styles.page}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Kiến trúc hệ thống</Text>
      <Text style={styles.sectionSubtitle}>
        Bluecore Data Warehouse được xây dựng theo tiêu chuẩn enterprise, scale cùng doanh nghiệp
      </Text>
      
      <View style={styles.row}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>[1] EXTRACT</Text>
          <Text style={styles.cardText}>
            35+ connectors tự động kéo data từ các platform:{'\n'}
            Shopee, Lazada, TikTok Shop, Haravan, KiotViet, Facebook Ads, Google Analytics...
          </Text>
        </View>
      </View>
      
      <View style={styles.row}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>[2] TRANSFORM</Text>
          <Text style={styles.cardText}>
            Chuẩn hoá dữ liệu về format thống nhất:{'\n'}
            Đơn vị tiền tệ, múi giờ, mã sản phẩm, mã khách hàng...
          </Text>
        </View>
      </View>
      
      <View style={styles.row}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>[3] LOAD</Text>
          <Text style={styles.cardText}>
            Lưu trữ vào Data Warehouse tối ưu cho phân tích:{'\n'}
            Truy vấn nhanh, lịch sử đầy đủ, backup tự động
          </Text>
        </View>
      </View>
      
      <View style={styles.row}>
        <View style={[styles.cardHighlight, { flex: 1 }]}>
          <Text style={[styles.cardTitle, { color: colors.success }]}>[4] ANALYZE</Text>
          <Text style={styles.cardText}>
            Kết nối với các công cụ BI yêu thích:{'\n'}
            Data Studio, Metabase, Power BI, hoặc Bluecore Dashboard
          </Text>
        </View>
      </View>
      
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>
          Từ 10 tabs mỗi sáng [--] 1 dashboard duy nhất
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>09</Text>
    </View>
  </Page>
);

const ManifestoPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Data Warehouse Manifesto</Text>
      <Text style={styles.sectionSubtitle}>10 nguyên tắc cốt lõi</Text>
      
      <View style={{ marginTop: 8 }}>
        {manifestoItems.map((item, idx) => (
          <View key={idx} style={styles.manifestoItem}>
            <View style={styles.manifestoNumber}>
              <Text style={styles.manifestoNumberText}>{idx + 1}</Text>
            </View>
            <Text style={styles.manifestoText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>10</Text>
    </View>
  </Page>
);

const CTAPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={[styles.sectionTitleWhite, { fontSize: 32, marginBottom: 12 }]}>
        Sẵn sàng có Single Source of Truth?
      </Text>
      <Text style={[styles.sectionSubtitleWhite, { fontSize: 14, marginBottom: 40 }]}>
        Liên hệ ngay để được demo miễn phí và tư vấn giải pháp phù hợp
      </Text>
      
      <View style={styles.coverStats}>
        <View style={styles.coverStatItem}>
          <Text style={styles.coverStatNumber}>35+</Text>
          <Text style={styles.coverStatLabel}>Connectors</Text>
        </View>
        <View style={styles.coverStatItem}>
          <Text style={styles.coverStatNumber}>1-2</Text>
          <Text style={styles.coverStatLabel}>Tuần triển khai</Text>
        </View>
        <View style={styles.coverStatItem}>
          <Text style={styles.coverStatNumber}>24/7</Text>
          <Text style={styles.coverStatLabel}>Hỗ trợ tiếng Việt</Text>
        </View>
      </View>
      
      <View style={[styles.cardDark, { width: 350, alignItems: 'center', padding: 24, marginTop: 40 }]}>
        <Text style={[styles.cardTitleWhite, { fontSize: 16, marginBottom: 16 }]}>Bluecore Team</Text>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.cardTextWhite}>Email: contact@bluecore.vn</Text>
        </View>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.cardTextWhite}>Website: bluecore.vn</Text>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 30, width: 350 }]}>
        <Text style={styles.quoteText}>Single Source of Truth</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>11</Text>
    </View>
  </Page>
);

// Main Document Component
const DataWarehouseSalesDeckPDF: React.FC = () => (
  <Document
    title="Bluecore Data Warehouse Sales Deck"
    author="Bluecore Team"
    subject="Data Warehouse - Single Source of Truth - 35+ Connectors"
    keywords="data warehouse, ETL, connectors, bluecore, vietnam, retail"
  >
    <CoverPage />
    <PainPointsPage />
    <ConnectorsPage />
    <ComparisonPage />
    <UseCasePage1 />
    <UseCasePage2 />
    <UseCasePage3 />
    <UseCasePage4 />
    <ArchitecturePage />
    <ManifestoPage />
    <CTAPage />
  </Document>
);

export default DataWarehouseSalesDeckPDF;
