/**
 * Data Warehouse Sales Deck PDF Component
 * 
 * Professional PDF sales deck for the Data Warehouse module
 * Following the 'Single Source of Truth' philosophy
 * Content based on https://bluecore.vn/blogs/news/10-loi-ich-va-truong-hop-su-dung-data-warehouse
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
  text: '#1e293b',
  textLight: '#64748b',
  textWhite: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  border: '#e2e8f0',
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
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  coverBadgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
  },
  coverTitle: {
    fontSize: 42,
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
  // Section styles
  sectionTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitleWhite: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.textWhite,
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 400,
    alignSelf: 'center',
  },
  sectionSubtitleWhite: {
    fontSize: 14,
    color: colors.accentLight,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 400,
    alignSelf: 'center',
  },
  // Card styles
  card: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 6,
  },
  cardTitleWhite: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.textWhite,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 11,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  cardTextWhite: {
    fontSize: 11,
    color: colors.accentLight,
    lineHeight: 1.5,
  },
  // Grid styles
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col2: {
    flex: 1,
    width: '48%',
  },
  col3: {
    flex: 1,
    width: '31%',
  },
  // Pill styles
  pillContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 30,
  },
  pill: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: 700,
  },
  // Quote styles
  quoteBox: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: 20,
    marginTop: 20,
  },
  quoteText: {
    fontSize: 14,
    color: colors.textWhite,
    textAlign: 'center',
    fontWeight: 700,
  },
  // Story block
  storyBlock: {
    backgroundColor: 'rgba(8, 145, 178, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  storyBlockDark: {
    backgroundColor: 'rgba(34, 211, 216, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentLight,
  },
  storyTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.accent,
    marginBottom: 8,
  },
  storyTitleWhite: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.accentLight,
    marginBottom: 8,
  },
  storyText: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 1.6,
  },
  storyTextWhite: {
    fontSize: 11,
    color: colors.textWhite,
    lineHeight: 1.6,
  },
  // Manifesto styles
  manifestoItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  manifestoNumber: {
    width: 24,
    height: 24,
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  manifestoNumberText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: 700,
  },
  manifestoTextWhite: {
    flex: 1,
    fontSize: 11,
    color: colors.textWhite,
    lineHeight: 1.5,
  },
  manifestoText: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    lineHeight: 1.5,
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
  // Mockup styles
  mockupContainer: {
    backgroundColor: colors.backgroundDark,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
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

// Content data - Vietnamese with full diacritics (tiếng Việt có dấu đầy đủ)
const threePillars = [
  { icon: '[=]', title: 'NHẤT QUÁN', desc: 'Dữ liệu chuẩn hoá' },
  { icon: '[*]', title: 'TẬP TRUNG', desc: 'Một nguồn duy nhất' },
  { icon: '[>]', title: 'TRUY CẬP', desc: 'Dễ dàng và nhanh chóng' },
];

// 5 lợi ích của Data Warehouse từ bluecore.vn
const dwBenefits = [
  {
    title: '1. Tính nhất quán',
    desc: 'Lưu trữ dữ liệu thường liên quan đến việc chuyển đổi dữ liệu từ nhiều nguồn và định dạng thành một định dạng chuẩn, giúp người dùng dễ dàng phân tích và chia sẻ thông tin chi tiết.',
  },
  {
    title: '2. Tính tập trung',
    desc: 'Kho dữ liệu giải quyết vấn đề hợp nhất dữ liệu từ nhiều hệ thống con được xây dựng trên các nền tảng khác nhau vào một kho lưu trữ duy nhất.',
  },
  {
    title: '3. Khả năng truy cập',
    desc: 'Người dùng doanh nghiệp có thể tự tạo báo cáo và truy vấn, truy cập tất cả dữ liệu từ một giao diện thay vì phải đăng nhập vào nhiều hệ thống.',
  },
  {
    title: '4. Khả năng kiểm soát',
    desc: 'Kho dữ liệu đảm bảo tính toàn vẹn của dữ liệu thông qua các biện pháp kiểm soát được triển khai đối với các vai trò và trách nhiệm liên quan.',
  },
  {
    title: '5. Làm sạch dữ liệu',
    desc: 'Kho dữ liệu sử dụng quy trình khử trùng để loại bỏ thông tin chất lượng kém, phát hiện các bộ dữ liệu trùng lặp, bị hỏng hoặc không chính xác.',
  },
];

// Use cases từ bluecore.vn
const useCases = [
  {
    title: 'Hiệu quả chiến dịch Marketing',
    persona: 'Marketing Manager',
    situation: 'Dữ liệu tiếp thị nằm rải rác trên nhiều hệ thống: CRM, hệ thống bán hàng, nền tảng quảng cáo',
    problem: 'Vào thời điểm các nhóm tập hợp dữ liệu phân tán vào bảng tính, dữ liệu có thể đã trở nên lỗi thời',
    solution: 'Kho dữ liệu tạo ra một nguồn dữ liệu duy nhất, hợp nhất dữ liệu từ các hệ thống bên trong và bên ngoài',
    result: 'Tất cả nhà tiếp thị đều có quyền truy cập vào cùng một dữ liệu được tiêu chuẩn hoá, theo dõi ROI và chi phí mua lại khách hàng tốt hơn',
  },
  {
    title: 'Đánh giá hiệu suất nhóm',
    persona: 'CEO / CFO',
    situation: 'Cần đánh giá hiệu suất của nhóm trong toàn tổ chức',
    problem: 'Dữ liệu nằm ở nhiều hệ thống khác nhau, khó tổng hợp để so sánh',
    solution: 'Người dùng có thể tìm hiểu sâu hơn về dữ liệu nhóm để tạo bảng điều khiển hoặc báo cáo tuỳ chỉnh',
    result: 'Các chỉ số như mô hình sử dụng, giá trị lâu dài của khách hàng có thể được sử dụng để đánh giá các nhóm',
  },
  {
    title: 'Hợp nhất dữ liệu từ hệ thống cũ',
    persona: 'IT Manager',
    situation: 'Dữ liệu cũ được lưu trữ ở định dạng cũ hoặc hệ thống lỗi thời, gây khó khăn cho việc truy cập',
    problem: 'Các hệ thống kế thừa được xây dựng để thực hiện các chức năng cụ thể và không được xây dựng để phân tích dữ liệu',
    solution: 'Kho dữ liệu có thể tự động kết nối với các hệ thống cũ để thu thập và phân tích dữ liệu, sử dụng ETL để chuyển đổi',
    result: 'Hợp nhất dữ liệu cũ với ứng dụng mới giúp cung cấp thông tin chi tiết hơn về các xu hướng lịch sử',
  },
  {
    title: 'Phân tích dữ liệu lớn theo thời gian thực',
    persona: 'Data Analyst',
    situation: 'Dữ liệu động lớn được tạo liên tục bởi nhiều nguồn: web, mobile, thương mại điện tử',
    problem: 'Dữ liệu không thể được phân tích lại sau khi truyền phát, cần xử lý ngay lập tức',
    solution: 'Kho dữ liệu có thể nhóm dữ liệu động lớn để hiển thị số liệu thống kê tổng thể',
    result: 'Hiểu rõ hơn về các hoạt động kinh doanh và khách hàng như số lần nhấp vào trang web, vị trí địa lý của thiết bị',
  },
];

// Kết quả khi sử dụng Data Warehouse
const dwResults = [
  'Luồng thông tin hợp lý hoá',
  'Chất lượng và tính nhất quán của dữ liệu được nâng cao',
  'Trí tuệ kinh doanh được cải thiện',
  'Lợi thế cạnh tranh đáng kể',
  'Cải thiện việc ra quyết định',
];

const manifestoItems = [
  'SINGLE SOURCE OF TRUTH - Chỉ có một phiên bản dữ liệu duy nhất',
  'TÍNH NHẤT QUÁN - Dữ liệu được chuẩn hoá từ nhiều nguồn và định dạng',
  'TÍNH TẬP TRUNG - Hợp nhất dữ liệu vào một kho lưu trữ duy nhất',
  'TRUY CẬP DỄ DÀNG - Người dùng có thể tự tạo báo cáo mà không cần IT',
  'KIỂM SOÁT CHẶT CHẼ - Phân quyền rõ ràng, đảm bảo tính toàn vẹn dữ liệu',
  'LÀM SẠCH DỮ LIỆU - Loại bỏ thông tin trùng lặp, bị hỏng, không chính xác',
  'TÍCH HỢP ETL - Kết nối và chuyển đổi dữ liệu từ các hệ thống cũ',
  'THỜI GIAN THỰC - Xử lý dữ liệu động lớn ngay lập tức',
  'BÁO CÁO THÔNG MINH - Tạo bảng điều khiển và báo cáo tuỳ chỉnh',
  'RA QUYẾT ĐỊNH TỐT HƠN - Cung cấp thông tin chi tiết và xu hướng lịch sử',
];

// Page components
const CoverPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={[styles.decorCircle, { width: 300, height: 300, top: -100, right: -100, backgroundColor: colors.accent }]} />
    <View style={[styles.decorCircle, { width: 200, height: 200, bottom: -50, left: -50, backgroundColor: colors.accentLight }]} />
    
    <View style={styles.coverContainer}>
      <View style={styles.coverBadge}>
        <Text style={styles.coverBadgeText}>BLUECORE DATA PLATFORM</Text>
      </View>
      <Text style={styles.coverTitle}>Data Warehouse</Text>
      <Text style={styles.coverSubtitle}>Kho dữ liệu hợp nhất cho doanh nghiệp</Text>
      <Text style={styles.coverTagline}>Single Source of Truth</Text>
      
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 8 }}>Hợp nhất dữ liệu từ nhiều nguồn</Text>
        <Text style={{ fontSize: 14, color: colors.accentLight, fontWeight: 700 }}>Nâng cao hiệu quả kinh doanh và ra quyết định tốt hơn</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>bluecore.vn</Text>
      <Text style={styles.pageNumberWhite}>01</Text>
    </View>
  </Page>
);

const WhatIsPage = () => (
  <Page size="A4" style={styles.page}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Data Warehouse là gì?</Text>
      <Text style={styles.sectionSubtitle}>
        Kho dữ liệu hợp nhất một lượng lớn dữ liệu từ nhiều nguồn và tối ưu hoá dữ liệu đó để cho phép phân tích
      </Text>
      
      <View style={styles.storyBlock}>
        <Text style={styles.storyText}>
          Kho dữ liệu hợp nhất một lượng lớn dữ liệu từ nhiều nguồn và tối ưu hoá dữ liệu đó để cho phép phân tích nhằm nâng cao hiệu quả kinh doanh, đưa ra quyết định tốt hơn và khám phá các lợi thế cạnh tranh.
        </Text>
      </View>
      
      <View style={styles.pillContainer}>
        {threePillars.map((pillar, idx) => (
          <View key={idx} style={styles.pill}>
            <Text style={styles.pillText}>{pillar.icon} {pillar.title}</Text>
          </View>
        ))}
      </View>
      
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>Data Warehouse cung cấp:</Text>
        <View style={{ marginTop: 12 }}>
          {dwResults.map((result, idx) => (
            <View key={idx} style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={{ color: colors.success, marginRight: 8, fontSize: 11 }}>[+]</Text>
              <Text style={styles.cardText}>{result}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>
          Các tổ chức nắm bắt được toàn bộ lợi ích của dữ liệu được trang bị tốt hơn để xử lý các điều kiện thị trường đang thay đổi
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>02</Text>
    </View>
  </Page>
);

const BenefitsPage1 = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleWhite}>5 Lợi ích của Data Warehouse</Text>
      <Text style={styles.sectionSubtitleWhite}>
        Kho dữ liệu được triển khai thành công có thể giúp tổ chức của bạn theo nhiều cách
      </Text>
      
      {dwBenefits.slice(0, 3).map((benefit, idx) => (
        <View key={idx} style={styles.cardDark}>
          <Text style={styles.cardTitleWhite}>{benefit.title}</Text>
          <Text style={styles.cardTextWhite}>{benefit.desc}</Text>
        </View>
      ))}
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>03</Text>
    </View>
  </Page>
);

const BenefitsPage2 = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>5 Lợi ích của Data Warehouse</Text>
      <Text style={styles.sectionSubtitle}>
        Tiếp tục...
      </Text>
      
      {dwBenefits.slice(3, 5).map((benefit, idx) => (
        <View key={idx} style={styles.card}>
          <Text style={styles.cardTitle}>{benefit.title}</Text>
          <Text style={styles.cardText}>{benefit.desc}</Text>
        </View>
      ))}
      
      <View style={[styles.quoteBox, { backgroundColor: colors.success }]}>
        <Text style={styles.quoteText}>
          Dữ liệu nhất quán hơn có nghĩa là các bộ phận kinh doanh riêng lẻ có thể sử dụng cùng một nguồn dữ liệu
        </Text>
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
      <Text style={styles.sectionTitle}>{useCases[0].title}</Text>
      
      <View style={styles.storyBlock}>
        <Text style={styles.storyTitle}>Tình huống: {useCases[0].persona}</Text>
        <Text style={styles.storyText}>{useCases[0].situation}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitle, { color: colors.error }]}>Vấn đề</Text>
        <Text style={styles.cardText}>{useCases[0].problem}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitle, { color: colors.success }]}>Giải pháp Data Warehouse</Text>
        <Text style={styles.cardText}>{useCases[0].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Facebook Ads | ROI</Text>
            <Text style={styles.mockupValue}>3.2x</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Google Ads | ROI</Text>
            <Text style={styles.mockupValue}>2.8x</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.mockupLabel}>Chi phí mua lại KH</Text>
            <Text style={styles.mockupValue}>125,000 VND</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16 }]}>
        <Text style={styles.quoteText}>Kết quả: {useCases[0].result}</Text>
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
        <Text style={styles.storyTitleWhite}>Tình huống: {useCases[1].persona}</Text>
        <Text style={styles.storyTextWhite}>{useCases[1].situation}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.error }]}>Vấn đề</Text>
        <Text style={styles.cardTextWhite}>{useCases[1].problem}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.success }]}>Giải pháp Data Warehouse</Text>
        <Text style={styles.cardTextWhite}>{useCases[1].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Sales Team | Hiệu suất</Text>
            <Text style={styles.mockupValue}>92%</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Marketing Team | Hiệu suất</Text>
            <Text style={styles.mockupValue}>88%</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.mockupLabel}>Customer LTV</Text>
            <Text style={styles.mockupValue}>2.5M VND</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16 }]}>
        <Text style={styles.quoteText}>Kết quả: {useCases[1].result}</Text>
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
      <Text style={styles.sectionTitle}>{useCases[2].title}</Text>
      
      <View style={styles.storyBlock}>
        <Text style={styles.storyTitle}>Tình huống: {useCases[2].persona}</Text>
        <Text style={styles.storyText}>{useCases[2].situation}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitle, { color: colors.error }]}>Vấn đề</Text>
        <Text style={styles.cardText}>{useCases[2].problem}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitle, { color: colors.success }]}>Giải pháp Data Warehouse</Text>
        <Text style={styles.cardText}>{useCases[2].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Hệ thống cũ | Trạng thái</Text>
            <Text style={[styles.mockupValue, { color: colors.success }]}>[OK] Đã kết nối</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>ETL Pipeline | Trạng thái</Text>
            <Text style={[styles.mockupValue, { color: colors.success }]}>[OK] Hoạt động</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.mockupLabel}>Dữ liệu lịch sử</Text>
            <Text style={styles.mockupValue}>5 năm</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16, backgroundColor: colors.success }]}>
        <Text style={styles.quoteText}>Kết quả: {useCases[2].result}</Text>
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
        <Text style={styles.storyTitleWhite}>Tình huống: {useCases[3].persona}</Text>
        <Text style={styles.storyTextWhite}>{useCases[3].situation}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.error }]}>Vấn đề</Text>
        <Text style={styles.cardTextWhite}>{useCases[3].problem}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.success }]}>Giải pháp Data Warehouse</Text>
        <Text style={styles.cardTextWhite}>{useCases[3].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Web Events / phút</Text>
            <Text style={styles.mockupValue}>10,000+</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Mobile Events / phút</Text>
            <Text style={styles.mockupValue}>5,000+</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.mockupLabel}>Xử lý Real-time</Text>
            <Text style={[styles.mockupValue, { color: colors.success }]}>[OK] Hoạt động</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16 }]}>
        <Text style={styles.quoteText}>Kết quả: {useCases[3].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>08</Text>
    </View>
  </Page>
);

const ManifestoPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Data Warehouse Manifesto</Text>
      <Text style={styles.sectionSubtitle}>10 nguyên tắc cốt lõi</Text>
      
      <View style={{ marginTop: 10 }}>
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
      <Text style={styles.pageNumber}>09</Text>
    </View>
  </Page>
);

const CTAPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={[styles.sectionTitleWhite, { fontSize: 32, marginBottom: 16 }]}>
        Sẵn sàng tập trung hoá dữ liệu?
      </Text>
      <Text style={[styles.sectionSubtitleWhite, { fontSize: 16, marginBottom: 40 }]}>
        Liên hệ để được tư vấn và demo miễn phí
      </Text>
      
      <View style={[styles.cardDark, { width: 350, alignItems: 'center', padding: 24 }]}>
        <Text style={[styles.cardTitleWhite, { fontSize: 16, marginBottom: 16 }]}>Bluecore Team</Text>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.cardTextWhite}>Email: contact@bluecore.vn</Text>
        </View>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.cardTextWhite}>Website: bluecore.vn</Text>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 40, width: 350 }]}>
        <Text style={styles.quoteText}>Single Source of Truth</Text>
      </View>
      
      <View style={{ marginTop: 30 }}>
        <Text style={{ fontSize: 10, color: colors.textLight, textAlign: 'center' }}>
          Kho dữ liệu có thể mang lại giá trị lớn cho các doanh nghiệp để tập trung hoá và tạo dữ liệu nhất quán hơn
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>10</Text>
    </View>
  </Page>
);

// Main Document Component
const DataWarehouseSalesDeckPDF: React.FC = () => (
  <Document
    title="Bluecore Data Warehouse Sales Deck"
    author="Bluecore Team"
    subject="Data Warehouse - Single Source of Truth"
    keywords="data warehouse, ETL, data platform, bluecore"
  >
    <CoverPage />
    <WhatIsPage />
    <BenefitsPage1 />
    <BenefitsPage2 />
    <UseCasePage1 />
    <UseCasePage2 />
    <UseCasePage3 />
    <UseCasePage4 />
    <ManifestoPage />
    <CTAPage />
  </Document>
);

export default DataWarehouseSalesDeckPDF;
