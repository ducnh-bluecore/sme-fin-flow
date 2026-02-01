/**
 * VC Pitch Deck PDF - Vietnamese Version
 * 
 * 12-slide Series A presentation for Vietnamese VCs
 * Focus on Category Claim: Financial Awareness Layer
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#0f172a', // slate-900
    padding: 60,
    justifyContent: 'center',
  },
  slideNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 10,
    color: '#64748b',
  },
  headline: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 1.2,
  },
  headlineAccent: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#60a5fa', // blue-400
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 1.2,
  },
  subheadline: {
    fontSize: 18,
    color: '#94a3b8', // slate-400
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 1.6,
  },
  body: {
    fontSize: 14,
    color: '#cbd5e1', // slate-300
    lineHeight: 1.8,
    marginBottom: 16,
  },
  punchline: {
    fontSize: 15,
    color: '#60a5fa',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 32,
    paddingLeft: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  diagramBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 24,
    marginVertical: 16,
  },
  diagramText: {
    fontSize: 12,
    color: '#e2e8f0',
    textAlign: 'center',
    marginVertical: 4,
  },
  arrow: {
    fontSize: 16,
    color: '#60a5fa',
    textAlign: 'center',
    marginVertical: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 8,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  gridBody: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 12,
    color: '#60a5fa',
    marginRight: 8,
  },
  listText: {
    fontSize: 13,
    color: '#cbd5e1',
    flex: 1,
    lineHeight: 1.5,
  },
  moatLayer: {
    backgroundColor: '#1e293b',
    borderRadius: 4,
    padding: 12,
    marginVertical: 4,
  },
  moatNumber: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  moatText: {
    fontSize: 13,
    color: '#e2e8f0',
  },
  highlight: {
    backgroundColor: '#1e3a5f',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  highlightText: {
    fontSize: 14,
    color: '#93c5fd',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    fontSize: 10,
    color: '#475569',
  },
});

// Slide Components - Vietnamese
const Slide01 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headlineAccent}>Tầng Nhận thức Tài chính</Text>
      <Text style={styles.headline}>cho Thương mại Hiện đại.</Text>
      <Text style={styles.subheadline}>
        Mọi công ty đều vận hành trên hệ thống ghi nhận.{'\n'}
        Thế hệ tiếp theo sẽ vận hành trên hệ thống nhận thức.
      </Text>
    </View>
    <Text style={styles.slideNumber}>1 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide02 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Doanh nghiệp không thất bại vì thiếu data.</Text>
      <Text style={styles.headlineAccent}>Họ thất bại vì sự thật tài chính đến muộn.</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>Thế giới cũ</Text>
          <Text style={styles.gridBody}>• Đóng sổ hàng tháng{'\n'}• Review hàng quý{'\n'}• Quyết định phản ứng</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>Thế giới mới</Text>
          <Text style={styles.gridBody}>• Margin bị nén{'\n'}• Cầu biến động{'\n'}• CAC tăng liên tục</Text>
        </View>
      </View>
      <Text style={styles.punchline}>Độ trễ quyết định = Rủi ro sống còn.</Text>
    </View>
    <Text style={styles.slideNumber}>2 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide03 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Data Stack hiện đại không được xây</Text>
      <Text style={styles.headlineAccent}>cho người ra quyết định.</Text>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>ERP → CRM → BI → Analytics</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Operators & Analysts</Text>
        <Text style={{ ...styles.arrow, marginTop: 16 }}>═══════════════════════</Text>
        <Text style={{ ...styles.highlightText, marginTop: 8 }}>TẦNG THIẾU: NHẬN THỨC ĐIỀU HÀNH</Text>
      </View>
      <Text style={styles.punchline}>
        Đội ngũ lãnh đạo vẫn vận hành mà không có hệ thống{'\n'}
        được thiết kế để trả lời: "Tài chính công ty có an toàn ngay lúc này?"
      </Text>
    </View>
    <Text style={styles.slideNumber}>3 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide04 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Bluecore là</Text>
      <Text style={styles.headlineAccent}>Hệ điều hành Quyết định Tài chính.</Text>
      <View style={styles.highlight}>
        <Text style={styles.highlightText}>
          Một hệ thống chuyển đổi các tín hiệu tài chính phân mảnh{'\n'}
          thành nhận thức điều hành thời gian thực —{'\n'}
          cho phép quyết định nhanh hơn, an toàn hơn.
        </Text>
      </View>
      <Text style={styles.punchline}>
        Nhận thức tài chính không phải tính năng.{'\n'}
        Đó là một tầng kiến trúc.
      </Text>
    </View>
    <Text style={styles.slideNumber}>4 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide05 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Kỷ nguyên Nhận thức</Text>
      <Text style={styles.headlineAccent}>Đã bắt đầu.</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>1. Data đã sẵn sàng</Text>
          <Text style={styles.gridBody}>APIs, marketplaces, payments — data tài chính cuối cùng đã kết nối</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>2. Cửa sổ thu hẹp</Text>
          <Text style={styles.gridBody}>Cửa sổ quyết định tính bằng tuần, không phải quý</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>3. Không còn sai số</Text>
          <Text style={styles.gridBody}>Biên độ sai số đang biến mất</Text>
        </View>
      </View>
      <Text style={styles.punchline}>
        Người thắng thập kỷ tới không phải người giàu data.{'\n'}
        Họ sẽ là người giàu nhận thức.
      </Text>
    </View>
    <Text style={styles.slideNumber}>5 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide06 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Tầng kiểm soát</Text>
      <Text style={styles.headlineAccent}>cho Sự thật Tài chính.</Text>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>Nguồn dữ liệu</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Sự thật Tài chính Thống nhất</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Decision Engine</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Cảnh báo Điều hành</Text>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', marginTop: 16, color: '#94a3b8' }}>
        Series A = Câu chuyện Kiến trúc, không phải Demo UI
      </Text>
    </View>
    <Text style={styles.slideNumber}>6 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide07 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Nhận thức Tài chính là</Text>
      <Text style={styles.headlineAccent}>Bài toán Hệ thống Phức tạp.</Text>
      <View style={{ marginVertical: 24 }}>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>→</Text>
          <Text style={styles.listText}>Ngữ nghĩa tài chính xuyên nền tảng</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>→</Text>
          <Text style={styles.listText}>Logic đối soát quy mô lớn</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>→</Text>
          <Text style={styles.listText}>Chuẩn hóa lợi nhuận xuyên kênh</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>→</Text>
          <Text style={styles.listText}>Mô hình quyết định cho điều hành</Text>
        </View>
      </View>
      <Text style={styles.punchline}>
        Đây không phải phần mềm bạn lắp ghép.{'\n'}
        Đây là phần mềm bạn kiến trúc.
      </Text>
    </View>
    <Text style={styles.slideNumber}>7 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide08 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Khi lãnh đạo tin tưởng hệ thống —</Text>
      <Text style={styles.headlineAccent}>Nó trở thành sống còn.</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>Retention</Text>
          <Text style={{ ...styles.gridBody, fontSize: 24, color: '#34d399' }}>95%+</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>Độ sâu sử dụng</Text>
          <Text style={{ ...styles.gridBody, fontSize: 24, color: '#34d399' }}>Hàng ngày</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>Phụ thuộc quyết định</Text>
          <Text style={{ ...styles.gridBody, fontSize: 24, color: '#34d399' }}>Chính</Text>
        </View>
      </View>
      <Text style={styles.punchline}>
        CEO mở Bluecore hàng ngày.{'\n'}
        Không phải hàng tháng.
      </Text>
    </View>
    <Text style={styles.slideNumber}>8 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide09 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Mọi doanh nghiệp nhạy cảm với margin</Text>
      <Text style={styles.headlineAccent}>Sẽ cần Tầng Nhận thức Tài chính.</Text>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>Bắt đầu hẹp: Retail / Ecommerce</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Mở rộng: Multi-brand · Consumer · Marketplaces</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Mid-market: Tất cả DN nhạy margin</Text>
      </View>
      <Text style={styles.punchline}>
        Chúng tôi đang bước vào thị trường tầng kiểm soát ngang —{'\n'}
        khởi đầu với một mũi nhọn dọc.
      </Text>
    </View>
    <Text style={styles.slideNumber}>9 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide10 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Nhận thức</Text>
      <Text style={styles.headlineAccent}>Cộng hưởng.</Text>
      <View style={{ marginVertical: 16 }}>
        <View style={styles.moatLayer}>
          <Text style={styles.moatNumber}>1. Tiêu chuẩn Ngữ nghĩa</Text>
          <Text style={styles.moatText}>Ngôn ngữ tài chính thống nhất xuyên hệ thống</Text>
        </View>
        <View style={styles.moatLayer}>
          <Text style={styles.moatNumber}>2. Dataset Quyết định</Text>
          <Text style={styles.moatText}>Patterns độc quyền từ quyết định điều hành</Text>
        </View>
        <View style={styles.moatLayer}>
          <Text style={styles.moatNumber}>3. Niềm tin Tổ chức</Text>
          <Text style={styles.moatText}>Sự tự tin của lãnh đạo được xây theo thời gian</Text>
        </View>
        <View style={styles.moatLayer}>
          <Text style={styles.moatNumber}>4. Lock-in Quy trình Điều hành</Text>
          <Text style={styles.moatText}>Thói quen hàng ngày rất khó thay đổi</Text>
        </View>
      </View>
      <Text style={styles.punchline}>
        Công ty không đổi hệ thống{'\n'}
        mà họ tin tưởng để nói sự thật.
      </Text>
    </View>
    <Text style={styles.slideNumber}>10 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide11 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Chúng tôi tin Nhận thức Tài chính</Text>
      <Text style={styles.headlineAccent}>Sẽ trở thành Hạ tầng Mặc định.</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>Hôm nay</Text>
          <Text style={styles.gridBody}>ERP là bắt buộc</Text>
        </View>
        <View style={{ ...styles.gridItem, backgroundColor: '#1e3a5f' }}>
          <Text style={styles.gridTitle}>Ngày mai</Text>
          <Text style={{ ...styles.gridBody, color: '#93c5fd' }}>Nhận thức là bắt buộc</Text>
        </View>
      </View>
      <Text style={styles.punchline}>
        Điều hành công ty mà không có nhận thức tài chính{'\n'}
        sớm sẽ cảm thấy liều lĩnh như điều hành mà không có kế toán.
      </Text>
    </View>
    <Text style={styles.slideNumber}>11 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide12 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Bluecore đang xây dựng</Text>
      <Text style={styles.headlineAccent}>Tầng kiểm soát Tài chính cho Thương mại.</Text>
      <View style={{ marginVertical: 24 }}>
        <Text style={{ ...styles.body, textAlign: 'center' }}>Khi Bluecore thắng:</Text>
        <View style={{ marginTop: 16 }}>
          <Text style={{ ...styles.diagramText }}>CEO chạy buổi sáng trên đó</Text>
          <Text style={{ ...styles.diagramText }}>Board tin tưởng nó</Text>
          <Text style={{ ...styles.diagramText }}>Operators căn chỉnh theo nó</Text>
        </View>
      </View>
      <View style={{ ...styles.highlight, marginTop: 32 }}>
        <Text style={{ ...styles.highlightText, fontWeight: 'bold', fontSize: 16 }}>
          Chúng tôi không xây một công cụ.{'\n'}
          Chúng tôi xây hệ thống mà các công ty dựa vào để sống sót.
        </Text>
      </View>
    </View>
    <Text style={styles.slideNumber}>12 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const VCPitchDeckPDF_VI: React.FC = () => (
  <Document>
    <Slide01 />
    <Slide02 />
    <Slide03 />
    <Slide04 />
    <Slide05 />
    <Slide06 />
    <Slide07 />
    <Slide08 />
    <Slide09 />
    <Slide10 />
    <Slide11 />
    <Slide12 />
  </Document>
);

export default VCPitchDeckPDF_VI;
